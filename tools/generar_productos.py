#!/usr/bin/env python3
from __future__ import annotations
import json,re,sys
from pathlib import Path
TYPO_RULES=[(r'\bROYCAL\b','ROYAL'),(r'\bBALANCECD\b','BALANCED'),(r'\bPupy\b','Puppy'),(r'\bAcive Mind\b','Active Mind'),(r'\bGastos Castrados\b','Gatos Castrados'),(r'\bMAINTENCE\b','MAINTENANCE'),(r'\bDermaconfort\b','Dermacomfort'),(r'\borignal\b','original'),(r'\bClasica\b','Clásica'),(r'\bCitricos\b','Cítricos'),(r'\bCalorias\b','Calorías'),(r'\bNeurologico\b','Neurológico'),(r'\bVias\b','Vías')]
BRAND_FROM_SECTION={'ROYAL CANIN PERRO':'Royal Canin','ROYAL CANIN GATO':'Royal Canin','KATZE':'Katze','Home Made Delights':'Home Made Delights','Labyes':'Labyes','FELIX':'Felix','GATI':'Gati','FANCY FEAST':'Fancy Feast'}
PACK_PATTERNS=[re.compile(r'\((\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cc)\s*x\s*\d+)\)',re.I),re.compile(r'\((\d+\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cc))\)',re.I)]
def clean_text(s):
    for pat,repl in TYPO_RULES:s=re.sub(pat,repl,s,flags=re.I)
    return re.sub(r'\s+',' ',s).strip()
def parse_value(v):
    v=v.strip()
    if v=='null':return None
    if v=='true':return True
    if v=='false':return False
    if v.startswith('"') and v.endswith('"'):return v[1:-1]
    try:return float(v) if '.' in v else int(v)
    except:return v
def pack_from_name(name):
    for pat in PACK_PATTERNS:
        m=pat.search(name)
        if m:return re.sub(r'\s+','',m.group(1)).replace('gr','g')
def infer_animal(name,category,section,current):
    if current:return current
    t=f'{name} {section}'.lower()
    if 'gato' in t or ' cat' in t or category.lower()=='higiene para gatos':return 'Gato'
    if 'perro' in t or ' dog' in t or 'canine' in t:return 'Perro'
    return None
def normalize(item,category,section):
    name=clean_text(item.get('producto',''));brand=item.get('marca') or BRAND_FROM_SECTION.get(section)
    if brand:brand=clean_text(str(brand))
    animal=infer_animal(name,category,section,item.get('tipo_animal'));quantity=item.get('cantidad');unit=item.get('unidad');presentation=item.get('presentacion')
    pack=pack_from_name(name)
    if pack and not presentation:
        presentation=pack
        if unit=='unidades':quantity,unit=None,None
    if category=='Higiene para gatos' and section=='Piedras Blancas' and unit=='kg/litros':unit='kg'
    if brand=='Can Cat' and 'silica' in name.lower():unit='litros'
    if brand=='Can Cat' and 'paño' in name.lower():unit='unidades'
    if isinstance(quantity,str) and quantity.lower().endswith(' lt'):quantity=float(quantity[:-3].replace(',','.'));unit='litros'
    if 'CrystalCat Silica' in name:unit='litros'
    price=item.get('precio');is_available=bool(item.get('disponible')) and isinstance(price,(int,float)) and price>0
    return {'category':clean_text('Higiene' if category=='Higiene para gatos' else category),'subcategory':clean_text(section),'brand':brand,'name':name,'animal':animal,'quantity':quantity,'unit':unit,'presentation':presentation,'price':price,'available':is_available,'notes':item.get('observaciones')}
def parse(md):
    category=section=current=None;out=[]
    for raw in md.splitlines()+['## EOF']:
        line=raw.rstrip()
        if line.startswith('## '):
            if current:out.append(normalize(current,category,section));current=None
            category=line[3:].strip();section=None;continue
        if line.startswith('### '):
            if current:out.append(normalize(current,category,section));current=None
            section=line[4:].strip();continue
        m=re.match(r'- producto: "(.*)"\s*$',line)
        if m:
            if current:out.append(normalize(current,category,section))
            current={'producto':m.group(1)};continue
        m=re.match(r'\s+- ([a-z_]+):\s*(.*)$',line)
        if m and current is not None:current[m.group(1)]=parse_value(m.group(2))
    return out
def main():
    if len(sys.argv)!=2:raise SystemExit('Uso: python tools/generar_productos.py data/listado_productos.md')
    products=parse(Path(sys.argv[1]).read_text(encoding='utf-8'))
    for i,p in enumerate(products,1):p['id']=i
    config='const CONFIG = Object.freeze({\n  shopName: "Emitos Peluquería Canina",\n  whatsappNumber: "5491127374051",\n  currency: "ARS",\n  locale: "es-AR"\n});\n\n'
    payload='const PRODUCTS = Object.freeze('+json.dumps(products,ensure_ascii=False,indent=2)+'.map(Object.freeze));\n'
    Path('productos.js').write_text(config+payload,encoding='utf-8')
    a=sum(1 for p in products if p['available']);print(f'Generados {len(products)} productos ({a} disponibles, {len(products)-a} no disponibles).')
if __name__=='__main__':main()
