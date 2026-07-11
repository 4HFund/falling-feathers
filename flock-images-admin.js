(() => {
  const CLOUD_NAME = 'ixfa510d';
  const UPLOAD_PRESET = 'ml_default';
  const API_BASE = (window.FFH_CONFIG?.apiBase || '').replace(/\/$/, '');
  const PIN_KEY = 'falling-feathers-admin-pin';
  const DELIMITER = ':::';
  const slots = [
    { key:'pekins', icon:'🦆', category:'ducks', badge:'Pekins', title:'Moonbeam & Ming Ming', description:'The Pekin ducks bring the classic duck charm, muddy footprints, and big personalities that helped define the hollow.' },
    { key:'rouens', icon:'🦆', category:'ducks', badge:'Rouens', title:'Pip, Puddles & Their Young', description:'The Rouen side of the flock is growing, with young birds being raised carefully as part of the sanctuary rhythm.' },
    { key:'runners', icon:'🐥', category:'babies', badge:'Runner Ducks', title:'Runner Ducklings', description:'Runner ducklings add motion, energy, and a little comedy to the daily routine.' },
    { key:'chickens', icon:'🐔', category:'chickens', badge:'Chicken Crew', title:'Chickens & Rooster', description:'The chicken crew supports the egg side of the hollow while bringing plenty of personality to the yard.' },
    { key:'quail', icon:'🪶', category:'quail', badge:'Quail', title:'Miniature & Jumbo Quail', description:'The quail are cared for in a small-scale setting and help make the quail egg side of the hollow possible.' },
    { key:'rescues', icon:'❤️', category:'rescues', badge:'Sanctuary', title:'Rescues & Special Care', description:'As needs arise, the hollow makes room for animals that need patience, safety, and a chance to settle in.' }
  ];
  let current = {};

  const pin = () => sessionStorage.getItem(PIN_KEY) || '';
  const contextValue = (photo, key) => photo?.context?.custom?.[key] || photo?.context?.[key] || '';
  const parseTitle = (photo, fallback) => {
    const raw = contextValue(photo, 'title');
    if (!raw.includes(DELIMITER)) return { badge:fallback.badge, title:raw || fallback.title };
    const [badge, ...title] = raw.split(DELIMITER);
    return { badge:badge.trim() || fallback.badge, title:title.join(DELIMITER).trim() || fallback.title };
  };
  const imageUrl = (photo, width=900) => `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width*.75)}/${photo.public_id}.${photo.format}`;

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .flock-manager-grid{display:grid;gap:1rem}.flock-manager-card{background:#fff;border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 10px 28px rgba(75,59,42,.07)}
      .flock-manager-top{display:grid;grid-template-columns:120px 1fr;gap:.9rem;padding:.9rem;align-items:center}.flock-manager-preview{aspect-ratio:4/3;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#fff6e5,#e7d1ad);font-size:2.8rem;overflow:hidden}.flock-manager-preview img{width:100%;height:100%;object-fit:cover;display:block}
      .flock-manager-name strong,.flock-manager-name small{display:block}.flock-manager-name strong{font-size:1.05rem;color:var(--deep)}.flock-manager-name small{color:var(--muted);line-height:1.4;margin-top:.25rem}.flock-manager-fields{padding:0 .9rem .9rem}.flock-manager-fields .field{margin:.75rem 0}.flock-manager-actions{display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-top:.8rem}.flock-picture-button,.flock-save-button{border:0;border-radius:13px;padding:.85rem;font-weight:900}.flock-picture-button{background:#f4e0c5;color:#5c4329}.flock-save-button{background:linear-gradient(135deg,var(--green2),var(--green));color:#fff}.flock-save-button:disabled{opacity:.55}
      @media(min-width:760px){.flock-manager-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.flock-manager-top{grid-template-columns:150px 1fr}}
      @media(max-width:430px){.flock-manager-top{grid-template-columns:100px 1fr}.flock-manager-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function createPanel(){
    const panel=document.createElement('section');
    panel.className='panel';panel.id='flock-image-controls';
    panel.innerHTML=`<div class="section-title"><h2>Flock Manager</h2><span>Pictures & wording</span></div><p style="line-height:1.55;margin-top:0">Manage each group on the public Meet the Flock page. Change its picture, badge, title, or description from one place.</p><div class="flock-manager-grid" id="flock-manager-grid"></div><div class="result" id="flock-image-message" aria-live="polite"></div>`;
    const mount=document.getElementById('photo-manager-mount');
    if(mount) mount.before(panel); else document.querySelector('main')?.appendChild(panel);
  }

  function message(text,type='success'){const el=document.getElementById('flock-image-message');el.textContent=text;el.className=`result show ${type}`;}

  async function api(path,options={}){
    const response=await fetch(`${API_BASE}${path}`,{...options,headers:{'Content-Type':'application/json','X-Admin-Pin':pin(),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||`Request failed with ${response.status}`);
    return data;
  }

  async function loadCurrent(){
    if(!API_BASE) return {};
    const response=await fetch(`${API_BASE}/gallery`);if(!response.ok)return{};
    const data=await response.json();const photos=Array.isArray(data.resources)?data.resources:[];const found={};
    slots.forEach(slot=>{found[slot.key]=photos.find(photo=>Array.isArray(photo.tags)&&photo.tags.includes(`flock-${slot.key}`))||null;});
    return found;
  }

  function valuesFor(slot,photo){const parsed=parseTitle(photo,slot);return{badge:parsed.badge,title:parsed.title,description:contextValue(photo,'description')||slot.description};}

  async function saveCard(slot){
    const card=document.querySelector(`[data-flock-admin-slot="${slot.key}"]`);const photo=current[slot.key];
    if(!photo){message(`Choose a picture for ${slot.title} before saving its wording.`,'error');return;}
    if(!pin()){message('Unlock the Photo Manager with your admin PIN first.','error');return;}
    const button=card.querySelector('.flock-save-button');button.disabled=true;button.textContent='Saving…';
    try{
      const badge=card.querySelector('[data-field="badge"]').value.trim();
      const title=card.querySelector('[data-field="title"]').value.trim();
      const description=card.querySelector('[data-field="description"]').value.trim();
      await api('/admin/photo',{method:'POST',body:JSON.stringify({public_id:photo.public_id,action:'edit',title:`${badge}${DELIMITER}${title}`,description,category:slot.category,tags:photo.tags||[]})});
      photo.context={custom:{title:`${badge}${DELIMITER}${title}`,description}};
      message(`${title || slot.title} was updated on the flock page.`);
    }catch(error){message(error.message,'error');}
    finally{button.disabled=false;button.textContent='Save Changes';}
  }

  function openUpload(slot){
    const card=document.querySelector(`[data-flock-admin-slot="${slot.key}"]`);
    const badge=card.querySelector('[data-field="badge"]').value.trim()||slot.badge;
    const title=card.querySelector('[data-field="title"]').value.trim()||slot.title;
    const description=card.querySelector('[data-field="description"]').value.trim()||slot.description;
    const widget=cloudinary.createUploadWidget({cloudName:CLOUD_NAME,uploadPreset:UPLOAD_PRESET,multiple:false,sources:['local','camera'],resourceType:'image',clientAllowedFormats:['jpg','jpeg','png','webp','heic'],maxFileSize:12000000,folder:`falling-feathers/flock/${slot.key}`,tags:['website-gallery',slot.category,`flock-${slot.key}`],context:{title:`${badge}${DELIMITER}${title}`,description},showAdvancedOptions:false,cropping:true,croppingAspectRatio:4/3,croppingShowDimensions:true},(error,result)=>{
      if(error){message(`Upload failed: ${error.message||'Unknown error'}`,'error');return;}
      if(result?.event==='success'){
        current[slot.key]={public_id:result.info.public_id,format:result.info.format||'jpg',tags:['website-gallery',slot.category,`flock-${slot.key}`],context:{custom:{title:`${badge}${DELIMITER}${title}`,description}}};
        card.querySelector('.flock-manager-preview').innerHTML=`<img src="${result.info.secure_url}" alt="${title}">`;
        card.querySelector('.flock-manager-name small').textContent='Custom picture selected';
        message(`${title} picture updated. You can also edit the wording and press Save Changes.`);
      }
    });widget.open();
  }

  function render(){
    const grid=document.getElementById('flock-manager-grid');grid.replaceChildren();
    slots.forEach(slot=>{const photo=current[slot.key];const values=valuesFor(slot,photo);const card=document.createElement('article');card.className='flock-manager-card';card.dataset.flockAdminSlot=slot.key;
      card.innerHTML=`<div class="flock-manager-top"><div class="flock-manager-preview">${photo?`<img src="${imageUrl(photo)}" alt="${values.title}">`:slot.icon}</div><div class="flock-manager-name"><strong>${slot.icon} ${values.title}</strong><small>${photo?'Custom picture selected':'Using the current page fallback until you upload a picture'}</small></div></div><div class="flock-manager-fields"><div class="field"><label>Badge</label><input data-field="badge" maxlength="35" value=""></div><div class="field"><label>Title</label><input data-field="title" maxlength="80" value=""></div><div class="field"><label>Description</label><textarea data-field="description" maxlength="500"></textarea></div><div class="flock-manager-actions"><button class="flock-picture-button" type="button">📷 Change Picture</button><button class="flock-save-button" type="button">Save Changes</button></div></div>`;
      card.querySelector('[data-field="badge"]').value=values.badge;card.querySelector('[data-field="title"]').value=values.title;card.querySelector('[data-field="description"]').value=values.description;
      card.querySelector('.flock-picture-button').addEventListener('click',()=>openUpload(slot));card.querySelector('.flock-save-button').addEventListener('click',()=>saveCard(slot));grid.appendChild(card);
    });
  }

  async function init(){if(document.getElementById('flock-image-controls'))return;addStyles();createPanel();current=await loadCurrent().catch(()=>({}));render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
