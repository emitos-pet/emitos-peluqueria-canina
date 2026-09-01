'use strict';

const $=id=>document.getElementById(id);

const productGrid=$('product-grid'),
categoryFilters=$('category-filters'),
searchInput=$('search-input'),
animalFilter=$('animal-filter'),
brandFilter=$('brand-filter'),
resultsSummary=$('results-summary'),
cartButton=$('cart-button'),
cartDrawer=$('cart-drawer'),
closeCartButton=$('close-cart'),
backdrop=$('backdrop'),
cartItems=$('cart-items'),
cartCount=$('cart-count'),
cartTotal=$('cart-total'),
whatsappButton=$('whatsapp-button'),
customerName=$('customer-name'),
customerNotes=$('customer-notes'),
emptyState=$('empty-state');

const MAX_CART_QUANTITY=99,
CART_STORAGE_KEY='emitos-cart-v2';

let activeCategory='Todos',
cart=loadCart();

const money=new Intl.NumberFormat(
  CONFIG.locale,
  {
    style:'currency',
    currency:CONFIG.currency,
    maximumFractionDigits:2
  }
);

function normalizeText(v,max=200){
  return String(v??'')
    .replace(/[\u0000-\u001F\u007F]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

function available(p){
  return p&&p.available===true&&Number.isFinite(p.price)&&p.price>0;
}

function isValidProductId(id){
  const n=Number(id);
  return Number.isInteger(n)&&PRODUCTS.some(p=>p.id===n&&available(p));
}

function sanitizeCart(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};

  const clean={};

  for(const[id,q]of Object.entries(raw)){
    const n=Number(id),
    qty=Number(q);

    if(
      isValidProductId(n)&&
      Number.isInteger(qty)&&
      qty>0
    ){
      clean[n]=Math.min(qty,MAX_CART_QUANTITY);
    }
  }

  return clean;
}

function loadCart(){
  try{
    return sanitizeCart(
      JSON.parse(localStorage.getItem(CART_STORAGE_KEY)||'{}')
    );
  }catch{
    return{};
  }
}

function saveCart(){
  cart=sanitizeCart(cart);
  localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(cart)
  );
}

function unique(v){
  return [...new Set(v.filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'es'));
}

function categories(){
  return ['Todos',...unique(PRODUCTS.map(p=>p.category))];
}

/*
  Perro y gato se mantiene como valor interno del producto,
  pero no aparece como filtro visible.
*/
function animals(){
  return ['Todos','Perro','Gato','General'];
}

function brands(){
  return ['Todas',...unique(PRODUCTS.map(p=>p.brand))];
}

function fillSelect(el,values){
  const current=el.value;

  el.textContent='';

  for(const v of values){
    const o=document.createElement('option');
    o.value=v;
    o.textContent=v;
    el.appendChild(o);
  }

  if(values.includes(current)){
    el.value=current;
  }
}

function renderFilters(){
  categoryFilters.textContent='';

  for(const category of categories()){
    const b=document.createElement('button');

    b.className=
      `filter-button ${category===activeCategory?'active':''}`;

    b.type='button';
    b.textContent=category;

    b.addEventListener('click',()=>{
      activeCategory=category;
      renderFilters();
      renderProducts();
    });

    categoryFilters.appendChild(b);
  }

  fillSelect(animalFilter,animals());
  fillSelect(brandFilter,brands());
}

function presentationText(p){
  if(p.presentation)return p.presentation;

  if(
    p.quantity!==null&&
    p.quantity!==undefined&&
    p.unit
  ){
    return `${String(p.quantity).replace('.',',')} ${p.unit}`;
  }

  return'';
}

function searchable(p){
  return[
    p.name,
    p.brand,
    p.category,
    p.subcategory,
    p.animal,
    p.presentation,
    p.quantity,
    p.unit,
    p.notes
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
}

/*
  Un producto "Perro y gato":
  - aparece al filtrar Perro
  - aparece al filtrar Gato
  - existe una sola vez en PRODUCTS

  Luego de aplicar filtros y búsqueda:
  - productos disponibles primero
  - productos no disponibles al final
*/
function filteredProducts(){
  const term=
    normalizeText(searchInput.value,80)
      .toLocaleLowerCase('es');

  const animal=animalFilter.value;
  const brand=brandFilter.value;

  return PRODUCTS
    .filter(p=>{
      const productAnimal=p.animal||'General';

      const matchesAnimal=
        animal==='Todos' ||
        productAnimal===animal ||
        (
          productAnimal==='Perro y gato' &&
          (
            animal==='Perro' ||
            animal==='Gato'
          )
        );

      return(
        (
          activeCategory==='Todos' ||
          p.category===activeCategory
        ) &&
        matchesAnimal &&
        (
          brand==='Todas' ||
          p.brand===brand
        ) &&
        (
          !term ||
          searchable(p).includes(term)
        )
      );
    })
    .sort(
      (a,b)=>
        Number(available(b))-
        Number(available(a))
    );
}

function renderProducts(){
  const filtered=filteredProducts();

  productGrid.textContent='';

  emptyState.classList.toggle(
    'hidden',
    filtered.length>0
  );

  resultsSummary.textContent=
    PRODUCTS.length
      ?`${filtered.length} de ${PRODUCTS.length} productos`
      :'Catálogo pendiente de generar desde el listado definitivo.';

  for(const p of filtered){
    const card=document.createElement('article');

    card.className=
      `product-card ${available(p)?'':'unavailable'}`;

    const body=document.createElement('div');
    body.className='product-body';

    const meta=document.createElement('div');
    meta.className='product-meta';

    meta.textContent=
      [p.brand,p.subcategory]
        .filter(Boolean)
        .join(' · ')||
      p.category;

    const name=document.createElement('h2');
    name.className='product-name';
    name.textContent=p.name;

    body.append(meta,name);

    const pres=presentationText(p);

    if(pres){
      const e=document.createElement('p');
      e.className='product-presentation';
      e.textContent=pres;
      body.appendChild(e);
    }

    if(p.notes){
      const n=document.createElement('p');
      n.className='product-notes';
      n.textContent=p.notes;
      body.appendChild(n);
    }

    const footer=document.createElement('div');
    footer.className='product-footer';

    const price=document.createElement('div');
    price.className='product-price';

    price.textContent=
      available(p)
        ?money.format(p.price)
        :'No disponible';

    const button=document.createElement('button');
    button.className='add-button';
    button.type='button';

    button.textContent=
      available(p)
        ?'Agregar al carrito'
        :'No disponible';

    button.disabled=!available(p);

    if(available(p)){
      button.addEventListener(
        'click',
        ()=>addToCart(p.id)
      );
    }

    footer.append(price,button);
    body.appendChild(footer);
    card.appendChild(body);
    productGrid.appendChild(card);
  }
}

function addToCart(id){
  if(!isValidProductId(id))return;

  cart[id]=Math.min(
    Number(cart[id]||0)+1,
    MAX_CART_QUANTITY
  );

  saveCart();
  renderCart();
}

function changeQuantity(id,delta){
  if(
    !isValidProductId(id)||
    !Number.isInteger(delta)
  )return;

  const next=
    Number(cart[id]||0)+delta;

  if(next<=0){
    delete cart[id];
  }else{
    cart[id]=Math.min(
      next,
      MAX_CART_QUANTITY
    );
  }

  saveCart();
  renderCart();
}

function removeFromCart(id){
  delete cart[id];
  saveCart();
  renderCart();
}

function cartEntries(){
  return Object.entries(sanitizeCart(cart))
    .map(([id,quantity])=>{
      const product=
        PRODUCTS.find(
          p=>p.id===Number(id)
        );

      return product
        ?{product,quantity}
        :null;
    })
    .filter(Boolean);
}

function calculateTotal(entries){
  return entries.reduce(
    (sum,i)=>
      sum+i.product.price*i.quantity,
    0
  );
}

function displayName(p){
  const pres=presentationText(p);

  return pres
    ?`${p.name} — ${pres}`
    :p.name;
}

function renderCart(){
  const entries=cartEntries(),
  totalItems=
    entries.reduce(
      (s,i)=>s+i.quantity,
      0
    ),
  total=calculateTotal(entries);

  cartCount.textContent=
    String(totalItems);

  cartTotal.textContent=
    money.format(total);

  whatsappButton.disabled=
    !entries.length;

  cartItems.textContent='';

  if(!entries.length){
    const p=document.createElement('p');
    p.textContent='Tu carrito está vacío.';
    cartItems.appendChild(p);
    return;
  }

  for(const{product,quantity}of entries){
    const item=document.createElement('div');
    item.className='cart-item';

    const info=document.createElement('div'),
    name=document.createElement('div'),
    price=document.createElement('div'),
    remove=document.createElement('button');

    name.className='cart-item-name';
    name.textContent=displayName(product);

    price.className='cart-item-price';
    price.textContent=
      `${money.format(product.price)} c/u`;

    remove.className='remove-button';
    remove.type='button';
    remove.textContent='Eliminar';

    remove.addEventListener(
      'click',
      ()=>removeFromCart(product.id)
    );

    info.append(name,price,remove);

    const controls=document.createElement('div'),
    minus=document.createElement('button'),
    qty=document.createElement('strong'),
    plus=document.createElement('button');

    controls.className='quantity-controls';

    minus.className=
      plus.className=
        'quantity-button';

    minus.type=
      plus.type=
        'button';

    minus.textContent='−';
    plus.textContent='+';
    qty.textContent=String(quantity);

    minus.addEventListener(
      'click',
      ()=>changeQuantity(product.id,-1)
    );

    plus.addEventListener(
      'click',
      ()=>changeQuantity(product.id,1)
    );

    controls.append(minus,qty,plus);
    item.append(info,controls);
    cartItems.appendChild(item);
  }
}

function openCart(){
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute(
    'aria-hidden',
    'false'
  );
  backdrop.classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeCart(){
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute(
    'aria-hidden',
    'true'
  );
  backdrop.classList.add('hidden');
  document.body.style.overflow='';
}

function buildWhatsappMessage(){
  const entries=cartEntries(),
  lines=[
    `Hola, quiero hacer un pedido en ${CONFIG.shopName}:`,
    ''
  ];

  for(const{product,quantity}of entries){
    lines.push(
      `• ${quantity} x ${displayName(product)} — ${money.format(product.price*quantity)}`
    );
  }

  lines.push(
    '',
    `Total: ${money.format(calculateTotal(entries))}`
  );

  const name=
    normalizeText(customerName.value,60),
  notes=
    normalizeText(customerNotes.value,300);

  if(name){
    lines.push(
      '',
      `Nombre: ${name}`
    );
  }

  if(notes){
    lines.push(
      `Aclaraciones: ${notes}`
    );
  }

  lines.push(
    '',
    'Pedido sujeto a confirmación de disponibilidad y precio final.'
  );

  return lines.join('\n');
}

function sendWhatsapp(){
  if(!cartEntries().length)return;

  const number=
    CONFIG.whatsappNumber.replace(/\D/g,'');

  if(number){
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsappMessage())}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}

$('shop-name').textContent=
  CONFIG.shopName;

$('footer-shop-name').textContent=
  CONFIG.shopName;

$('year').textContent=
  new Date().getFullYear();

document.title=
  `${CONFIG.shopName} | Catálogo`;

searchInput.addEventListener(
  'input',
  renderProducts
);

animalFilter.addEventListener(
  'change',
  renderProducts
);

brandFilter.addEventListener(
  'change',
  renderProducts
);

cartButton.addEventListener(
  'click',
  openCart
);

closeCartButton.addEventListener(
  'click',
  closeCart
);

backdrop.addEventListener(
  'click',
  closeCart
);

whatsappButton.addEventListener(
  'click',
  sendWhatsapp
);

document.addEventListener(
  'keydown',
  e=>{
    if(e.key==='Escape'){
      closeCart();
    }
  }
);

renderFilters();
renderProducts();
renderCart();