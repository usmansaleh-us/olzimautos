/* BYD EV frontend API bridge. Set window.BYD_API_BASE before this file if deploying the API elsewhere. */
window.BYD_API_BASE = window.BYD_API_BASE || 'http://localhost:4000/api';
window.bydApi = async function(path, options={}) {
  const headers = Object.assign({'Content-Type':'application/json'}, options.headers||{});
  const token = localStorage.getItem('bydToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(window.BYD_API_BASE + path, {...options, headers});
  let data={}; try { data=await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};
function apiError(e){ notify(e.message || 'Something went wrong'); }

window.submitAuth = async function(mode){
  const email=document.getElementById('authEmail').value.trim();
  const pass=document.getElementById('authPass').value;
  const name=mode==='register'?(document.getElementById('authName')?.value.trim()||'') : undefined;
  if(!email||!pass||(mode==='register'&&!name)){notify('Please complete the required fields');return;}
  try{
    const data=await bydApi(`/auth/${mode==='register'?'register':'login'}`,{method:'POST',body:JSON.stringify(mode==='register'?{name,email,password:pass}:{email,password:pass})});
    localStorage.setItem('bydToken',data.token); localStorage.setItem('bydUser',JSON.stringify(data.user));
    notify(mode==='register'?'Account created successfully':'Signed in successfully');
    setTimeout(()=>location.hash='#/dashboard',300);
  }catch(e){apiError(e);}
};
window.choosePlan = async function(name){
  if(!localStorage.getItem('bydToken')){location.hash='#/register';return;}
  try{const d=await bydApi('/membership/select',{method:'POST',body:JSON.stringify({plan:name})});localStorage.setItem('bydUser',JSON.stringify(d.user));notify(`${name} membership selected`);}catch(e){apiError(e);}
};
window.confirmTestDrive = async function(model){
  const payload={model,fullName:document.getElementById('tdName')?.value.trim(),phone:document.getElementById('tdPhone')?.value.trim(),date:document.getElementById('tdDate')?.value,time:document.getElementById('tdTime')?.value};
  try{await bydApi('/test-drives',{method:'POST',body:JSON.stringify(payload)});closeModal();notify(`Test drive request for ${model} submitted`);}catch(e){apiError(e);}
};
window.openQuote = function(model){
  openModal('Request a Quote',`<p style="font-size:11px;color:var(--muted)">Get a quotation for <b>${model}</b>.</p><div class="field"><label>Full Name</label><input id="qname" placeholder="Your name"></div><div class="field"><label>Email</label><input id="qemail" type="email" placeholder="you@example.com"></div><div class="field"><label>Message</label><textarea id="qmsg" rows="4">I would like a quotation for ${model}.</textarea></div><div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitQuote('${model}')">Request Quote</button></div>`);
};
window.submitQuote=async function(model){try{await bydApi('/quotes',{method:'POST',body:JSON.stringify({model,fullName:document.getElementById('qname').value,email:document.getElementById('qemail').value,message:document.getElementById('qmsg').value})});closeModal();notify('Quote request submitted');}catch(e){apiError(e);}};
window.openService=function(){
  openModal('Book a Service',`<div class="field"><label>Service</label><select id="svc"><option>Vehicle Health Check</option><option>Battery Diagnostic</option><option>Software Update</option><option>General Service</option></select></div><div class="form-grid"><div class="field"><label>Date</label><input id="svcDate" type="date"></div><div class="field"><label>Time</label><input id="svcTime" type="time"></div></div><div class="field"><label>Notes</label><textarea id="svcNotes" rows="3" placeholder="Anything the service team should know?"></textarea></div><div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitService()">Book Service</button></div>`);
};
window.submitService=async function(){
  try{await bydApi('/appointments',{method:'POST',body:JSON.stringify({service:document.getElementById('svc').value,date:document.getElementById('svcDate').value,time:document.getElementById('svcTime').value,notes:document.getElementById('svcNotes').value})});closeModal();notify('Service appointment booked');if(location.hash==='#/appointments')location.reload();}catch(e){apiError(e);}
};
window.sendContact=async function(){try{await bydApi('/contact',{method:'POST',body:JSON.stringify({name:document.getElementById('cname').value,email:document.getElementById('cemail').value,message:document.getElementById('cmsg').value})});notify('Your enquiry has been sent');document.getElementById('cmsg').value='';}catch(e){apiError(e);}};
window.logout=function(){localStorage.removeItem('bydUser');localStorage.removeItem('bydToken');notify('Logged out');setTimeout(()=>location.hash='#/',300)};

function dashboardShell(section='dashboard'){
 const u=JSON.parse(localStorage.getItem('bydUser')||'{}');
 const labels={dashboard:'Dashboard',profile:'My Profile',vehicles:'My Vehicles',membership:'Membership',history:'Service History',appointments:'Appointments',payments:'Payments',support:'Support',settings:'Settings'};
 const items=[['dashboard','⌂'],['profile','◉'],['vehicles','▣'],['membership','♕'],['history','↻'],['appointments','◷'],['payments','₦'],['support','?'],['settings','⚙']];
 return `<div class="dashboard"><aside class="sidebar"><div class="side-brand">BYD <span style="color:#8da1bc">EV</span></div><div class="side-label">Account</div>${items.map(([x,ic])=>`<a class="side-link ${section===x?'active':''}" href="#/${x}"><span>${ic}</span>${x[0].toUpperCase()+x.slice(1)}</a>`).join('')}<div style="margin-top:25px"><a class="side-link" onclick="logout()"><span>↪</span>Logout</a></div></aside><main class="dash-main"><div class="welcome"><div><h1>${labels[section]||'Dashboard'}</h1><p>Welcome back, ${u.name||'Customer'}! Manage your BYD EV ownership experience.</p></div><div class="level"><span>Membership Level</span><strong>◆ ${u.membershipPlan||'Bronze'}</strong><small style="display:block;margin-top:4px;color:#8b96a5">Account connected to API</small></div></div><div id="dashboard-data" class="panel" style="padding:24px"><p style="color:var(--muted)">Loading your account data…</p></div></main></div>`;
}
window.dashboard=dashboardShell;

async function hydrateDashboard(){
 const hash=location.hash.replace(/^#\/?/,''); const section=hash.split('/')[0];
 if(!['dashboard','profile','vehicles','membership','history','appointments','payments','support','settings'].includes(section)||!document.getElementById('dashboard-data')) return;
 const box=document.getElementById('dashboard-data');
 try{
  if(section==='dashboard'){
   const d=await bydApi('/dashboard');
   const v=d.vehicle; const a=d.appointments||[];
   box.innerHTML=`<div class="dash-grid"><div><div class="dash-card"><h3>My Vehicle</h3><div class="vehicle-mini">${v?`<div class="mini-img">${carSVG(models.find(x=>x.slug===v.slug)||models[1])}</div><div><strong>${v.name}</strong><small>${v.type}</small><small>VIN: ${v.vin}</small><button class="btn btn-primary" style="margin-top:9px;padding:8px 11px" onclick="location.hash='#/vehicle/${v.slug}'">View Vehicle Details</button></div>`:`<div><strong>No vehicle registered yet.</strong><small>Add your VIN in the My Vehicles section.</small></div>`}</div></div><div class="dash-stats"><div class="stat"><small>Service Records</small><strong>${d.serviceCount}</strong></div><div class="stat"><small>Active Appointments</small><strong>${a.length}</strong></div><div class="stat"><small>Membership</small><strong>${d.user.membershipPlan}</strong></div></div></div><div class="dash-card"><h3>Quick Actions</h3><button class="btn btn-soft full" style="margin-bottom:8px" onclick="openTestDrive('BYD SEAL')">Book Test Drive</button><button class="btn btn-soft full" style="margin-bottom:8px" onclick="openService()">Book Service</button><button class="btn btn-primary full" onclick="location.hash='#/support'">Contact Support</button></div></div><div class="dash-card" style="margin-top:16px"><h3>Upcoming Appointments</h3>${a.length?a.map(x=>`<div class="list-row"><span>${x.service}<small style="display:block;color:#8b96a5">${x.appointment_date} · ${x.appointment_time} · ${x.location}</small></span><b>${x.status}</b></div>`).join(''):'<p style="color:var(--muted)">No upcoming appointments.</p>'}</div>`;
  } else if(section==='profile'){
   const d=await bydApi('/auth/me'); const u=d.user; box.innerHTML=`<h3>Personal Information</h3><div class="form-grid"><div class="field"><label>Full Name</label><input id="pfName" value="${u.name||''}"></div><div class="field"><label>Email</label><input value="${u.email||''}" disabled></div><div class="field"><label>Phone</label><input id="pfPhone" value="${u.phone||''}"></div><div class="field"><label>City</label><input id="pfCity" value="${u.city||''}"></div></div><button class="btn btn-primary" onclick="saveProfile()">Save Changes</button>`;
  } else if(section==='appointments'){
   const d=await bydApi('/appointments');box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><h3>Appointments</h3><button class="btn btn-primary" onclick="openService()">Book Service</button></div>${d.appointments.length?d.appointments.map(x=>`<div class="list-row"><span><b>${x.service}</b><small style="display:block;color:#8b96a5">${x.appointment_date} · ${x.appointment_time} · ${x.location}</small></span><span class="status">${x.status}</span></div>`).join(''):'<p style="color:var(--muted)">No appointments yet.</p>'}`;
  } else if(section==='history'){
   const d=await bydApi('/service-history');box.innerHTML=`<h3>Service History</h3>${d.history.length?d.history.map(x=>`<div class="list-row"><span>${x.service}<small style="display:block;color:#8b96a5">${x.service_date}${x.vehicle_name?' · '+x.vehicle_name:''}</small></span><b>${x.status}</b></div>`).join(''):'<p style="color:var(--muted)">No service history yet.</p>'}`;
  } else if(section==='payments'){
   const d=await bydApi('/payments');box.innerHTML=`<h3>Payments</h3>${d.payments.length?d.payments.map(x=>`<div class="list-row"><span>${x.description}<small style="display:block;color:#8b96a5">${x.reference||'No reference'} · ${x.created_at}</small></span><b>${x.currency} ${Number(x.amount).toLocaleString()}</b></div>`).join(''):'<p style="color:var(--muted)">No payments recorded. Payment gateway can be connected in the production phase.</p>'}`;
  } else if(section==='support'){
   const d=await bydApi('/support');box.innerHTML=`<h3>Support</h3><div class="field"><label>Subject</label><input id="supSubject" placeholder="e.g. Vehicle service question"></div><div class="field"><label>Message</label><textarea id="supMsg" rows="5" placeholder="Describe your issue…"></textarea></div><button class="btn btn-primary" onclick="submitSupport()">Submit Request</button><h3 style="margin-top:28px">My Tickets</h3>${d.tickets.map(x=>`<div class="list-row"><span>${x.subject}<small style="display:block;color:#8b96a5">${x.created_at}</small></span><b>${x.status}</b></div>`).join('')||'<p style="color:var(--muted)">No tickets.</p>'}`;
  } else if(section==='vehicles'){
   const d=await bydApi('/my/vehicles');box.innerHTML=`<h3>My Vehicles</h3>${d.vehicles.length?d.vehicles.map(x=>`<div class="list-row"><span><b>${x.name}</b><small style="display:block;color:#8b96a5">VIN: ${x.vin}</small></span><button class="btn btn-outline" onclick="location.hash='#/vehicle/${x.slug}'">Details</button></div>`).join(''):'<p style="color:var(--muted)">No vehicles linked to your account yet.</p>'}`;
  } else if(section==='membership'){
   const d=await bydApi('/memberships');box.innerHTML=`<h3>Membership Plans</h3><div class="cards">${d.memberships.map(x=>`<div class="plan"><h3>${x.name}</h3><div class="plan-price">${x.price}</div><ul>${x.features.map(f=>`<li>${f}</li>`).join('')}</ul><button class="btn btn-primary full" onclick="choosePlan('${x.name}')">Choose ${x.name}</button></div>`).join('')}</div>`;
  } else if(section==='settings'){
   box.innerHTML=`<h3>Settings</h3>${['Email notifications','Service reminders','Membership updates'].map(x=>`<div class="list-row"><span>${x}</span><input type="checkbox" checked></div>`).join('')}<p style="font-size:11px;color:var(--muted);margin-top:18px">Notification preferences are ready for backend persistence in the next production iteration.</p>`;
  }
 }catch(e){box.innerHTML=`<p style="color:#b42318">${e.message}. Make sure the BYD API is running and the API URL is configured.</p>`;}
}
window.saveProfile=async function(){try{const d=await bydApi('/profile',{method:'PUT',body:JSON.stringify({name:document.getElementById('pfName').value,phone:document.getElementById('pfPhone').value,city:document.getElementById('pfCity').value})});localStorage.setItem('bydUser',JSON.stringify(d.user));notify('Profile changes saved');}catch(e){apiError(e);}};
window.submitSupport=async function(){try{await bydApi('/support',{method:'POST',body:JSON.stringify({subject:document.getElementById('supSubject').value,message:document.getElementById('supMsg').value})});notify('Support request submitted');hydrateDashboard();}catch(e){apiError(e);}};
window.addEventListener('hashchange',()=>setTimeout(hydrateDashboard,0));
setTimeout(hydrateDashboard,0);
