import { useState } from 'react';
import domestic from './procurement/norwegian.json';
import foreign from './procurement/foreign.json';
import rules from './procurement/import-rules.json';
import type { Data } from './types.ts';
const kr=(v:number)=>v.toLocaleString('nb-NO',{maximumFractionDigits:2})+' kr';
const fx=(currency:string|null)=>currency==='USD'?foreign.budgetFx.rates.USD.nokPerUnit:currency==='EUR'?foreign.budgetFx.rates.EUR.nokPerUnit:1;
const comparable=['nema17','gt2-belt','bearing-608','driver-tmc2209'];
const noTotal=domestic.records.filter(r=>comparable.includes(r.id)).reduce((s,r)=>s+(r.totalPrice??0),0);
const foreignTotal=foreign.rows.filter(r=>comparable.includes(r.id)).reduce((s,r)=>s+(r.totalPrice??0)*fx(r.currency),0);
const caveats:Record<string,string>={
  nema17:'Motorene er ulike varianter. Moment, strøm, aksling og innfesting må godkjennes.',
  'mgn9-rail':'Lengde og vogn må passe sammen. Norsk kandidat er 1195 mm; eventuell kapping og slaglengde må avklares.',
  'mgn9-block':'Generiske vogner er ikke automatisk kompatible med den valgte skinnen.',
  'profile-2020':'Profilspor og T-mutre må passe. Den utenlandske profilen er ikke bekreftet lik den norske.',
  'mcu':'Kontroller eksakt kortvariant, spenning og antall. Pris fra utenlandsk side er ikke et norsk leveringstilbud.',
  'psu-12v':'Strømbehovet for hele maskinen er ikke ferdig beregnet. 60 W er ikke godkjent som tilstrekkelig.',
  thermistor:'Glassperle og metallpatron krever ulike fester. NTC-verdi og kalibrering må stemme.',
  yarn:'Farger, tykkelse, meter og antall nøster må kontrolleres. Garnet er ikke prøvd i maskinen.',
  servo:'Servovarianten er en kandidat. Kraft, slag og spenning må dimensjoneres.',
};
function Offer({record,abroad=false}:{record:any;abroad?:boolean}){
 if(!record)return <span className="purchase-unknown">Ingen dokumentert variant og pris</span>;
 const price=record.totalPrice,stock=record.stockStatus;
 return <><strong className="offer-price">{price==null?'Pris uavklart':kr(price*fx(record.currency))}</strong><span className="offer-basis">{price!=null&&(abroad?`${record.totalPrice} ${record.currency} · varepris, før avklart norsk mva og frakt`:record.vatIncluded===true?'inkl. mva · før frakt':'mva-grunnlag ikke bekreftet · før frakt')}</span>
 {record.url&&<a href={record.url} target="_blank" rel="noreferrer">{record.supplier||'Produktkandidat'} ↗</a>}
 <small>{record.title||record.requestedTitle}</small>{record.completePurchaseLine===false&&<small>Delvis tilbud: dekker ikke hele behovet på denne posten.</small>}
 <span className={'stock-status '+(stock==='in-stock'?'stock-yes':stock==='out-of-stock'?'stock-no':'')}>{stock==='in-stock'?'Oppgitt på lager':stock==='out-of-stock'?'Utsolgt':stock==='reported-in-stock-warehouse-unconfirmed'?'Lager oppgitt · avsenderlager uavklart':'Lager ikke bekreftet'}{record.stockQty!=null?` · ${record.stockQty}`:''}</span>
 <details className="offer-details"><summary>Variant, antall og kildegrunnlag</summary><p>{record.quantityToBuy!=null?`${record.quantityToBuy} kjøpsenheter × ${record.packSize??1} per pakke.`:'Kjøpsenhet ikke fastsatt.'} {record.specification}</p><p>{record.stockEvidence}</p><p>{record.compatibilityCaveat||record.compatibility}</p><p>Kontrollert {record.checkedAt}. Lager er et øyeblikksbilde. Frakt og ferdig levert pris er ikke bekreftet.</p></details></>;
}
export function Procurement({data,filament}:{data:Data;filament:number}){
 const [shipping,setShipping]=useState(''),[duty,setDuty]=useState(''),[fee,setFee]=useState('');
 const [goods,setGoods]=useState(foreignTotal.toFixed(2)),[taxMode,setTaxMode]=useState('ordinary');
 const valid=[goods,shipping,duty,fee].every(v=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0);
 const base=Number(goods)+Number(shipping)+Number(duty),vat=taxMode==='ordinary'?base*.25:0,total=base+vat+Number(fee);
 return <>
 <div className="page-heading"><div><span className="eyebrow">ESPEN / BESTILLING OG BETALING</span><h1>Norge og utlandet, del for del.</h1><p>Espen kjøper delene og betaler Øyvinds filament. Kilder kontrollert 5. oktober 2026.</p></div></div>
 <div className="purchase-budget"><strong>9 379 kr</strong><p>Det tidligere budsjettet for 24 poster. Det er ikke et oppdatert tilbud eller hele byggeprisen: ytterligere 12 poster mangler spesifikasjon eller pris. Filamentforbruket i dagens V1-pakke er beregnet til {kr(filament)} med tillegg.</p></div>
 <section className="purchase-comparison"><div className="section-heading"><div><h2>Samme fire poster sammenlignet.</h2><p>Seks motorer, fem meter reim, åtte lager og sju motordrivere. Kandidater, ikke godkjente erstatninger.</p></div></div>
 <div className="cost-overview"><article><span>NORSKE FORHANDLERE</span><strong>{kr(noTotal)}</strong><p>Inkl. mva, før frakt. Leverandørene oppgir nok på lager. Passform er ikke validert.</p></article><article><span>UTENLANDSKE KANDIDATER</span><strong>{kr(foreignTotal)}</strong><p>Oppgitte varepriser omregnet til NOK. Norsk mva, frakt og lager for hele antallet er uavklart.</p></article><article className="total"><span>HELE MASKINEN LEVERT</span><strong>Uavklart</strong><p>Fire av 24 historiske poster sammenlignes her. Ingen komplett handlekurv er dokumentert.</p></article></div>
 <p className="small">En femtedel av det gamle budsjettet er {kr(9379/5)}. Vi har ikke dokumentert en komplett, tilsvarende maskin til denne prisen. Temu og Alibaba ga ikke et verifiserbart tilbud med riktig variant, antall, lager og norsk levering; direkteleverandører er vist der det finnes bedre produktgrunnlag. Billigere komponenter er ikke dokumentasjon på samme resultat.</p></section>
 <div className="section-heading"><div><h2>Hele innkjøpslisten.</h2><p>Alle 36 poster er beholdt. Priser gjelder kjøpsmengden i den enkelte produktkandidaten.</p></div></div>
 <div className="table-wrap procurement-table"><table><thead><tr><th>Komponent / behov</th><th>Norsk alternativ</th><th>Utenlandsk alternativ</th></tr></thead><tbody>{data.purchases.map(p=><tr key={p.id}><td><strong>{p.item}</strong><small>Behov: {p.qty}</small><p>{caveats[p.id]||'Eksakt variant og innfesting må kontrolleres mot den ferdige konstruksjonen.'}</p>{p.priceNok!=null&&<small>Tidligere budsjett: {kr(p.priceNok*p.qty)}</small>}</td><td><Offer record={domestic.records.find(r=>r.id===p.id)}/></td><td><Offer record={foreign.rows.find(r=>r.id===p.id)} abroad/></td></tr>)}</tbody></table></div>
 <section className="import-calculator"><div className="section-heading"><div><h2>Hva kommer i tillegg ved import?</h2><p>Regneeksempel for én sending. Tomme felt betyr ukjent, ikke gratis.</p></div></div>
 <p>Frakt, 25 % norsk mva og eventuelt fortollingsgebyr kan endre prisforskjellen. Tollavgift avhenger av varens klassifisering. Ikke legg på mva en gang til hvis et bekreftet sluttilbud allerede inkluderer norsk mva og importkostnader.</p>
 <div className="form-grid"><label>Varebeløp · NOK<input type="number" min="0" value={goods} onChange={e=>setGoods(e.target.value)}/></label><label>Frakt og forsikring · NOK<input type="number" min="0" placeholder="Ukjent" value={shipping} onChange={e=>setShipping(e.target.value)}/></label><label>Tollavgift / øvrig avgiftsgrunnlag · NOK<input type="number" min="0" placeholder="Må avklares" value={duty} onChange={e=>setDuty(e.target.value)}/></label><label>Transportørens gebyr · NOK<input type="number" min="0" placeholder="Avhenger av transportør" value={fee} onChange={e=>setFee(e.target.value)}/></label><label>Mva-behandling<select aria-label="Mva-behandling" value={taxMode} onChange={e=>setTaxMode(e.target.value)}><option value="ordinary">Vanlig import · legg til 25 %</option><option value="included">Alle beløp inkluderer norsk mva</option></select></label></div>
 <div className="quote-result"><strong>{valid?kr(total):'Ferdig levert pris: uavklart'}</strong><p>{valid?`Regneeksempel med dine forutsetninger. Ekstra mva: ${kr(vat)}. Dette er ikke et leverandørtilbud.`:'Fyll ut alle beløp for å lage et regneeksempel. Startbeløpet er de fire utenlandske kandidatpostene over; de sendes ikke nødvendigvis samlet. Beregn hver faktisk sending separat.'}</p></div>
 <p className="small">Posten oppgir 46 kr for verdibåndet 0–500 kr, 78 kr for 500–3000 kr og 278 kr over 3000 kr ved vanlig fortolling; særregler og andre transportører kan gi andre gebyrer. Bekreft sats ved en nøyaktig grenseverdi. Korrekt elektronisk VOEC-behandling med forhåndsbetalt mva gir ikke dette gebyret. VOEC-grensen gjelder per vare under 3000 kr, ikke samlet handlekurv.</p>
 <p className="small">StepperOnline tilbyr forhåndsbetaling av importavgifter til Norge. Beløpet og frakten må bekreftes i et norsk leveringstilbud. For andre kandidater er VOEC-status ikke verifisert. Norsk postnummer og ferdige produktvalg mangler, derfor er ingen levert total merket som bekreftet.</p>
 <div className="purchase-sources"><a href="https://www.posten.no/fortolling/motta-fra-utlandet" target="_blank" rel="noreferrer">Postens gebyrer ↗</a><a href="https://www.toll.no/no/netthandel/utregning-mva/" target="_blank" rel="noreferrer">Tolletaten: beregning ↗</a><a href="https://www.toll.no/no/netthandel/VOEC" target="_blank" rel="noreferrer">VOEC ↗</a><a href={rules.sellerSpecific[0].source} target="_blank" rel="noreferrer">StepperOnline: importavgifter ↗</a><a href={foreign.budgetFx.methodologyUrl} target="_blank" rel="noreferrer">Norges Bank: valutakurser ↗</a></div>
 <p className="small">Omregning: 1 USD = {foreign.budgetFx.rates.USD.nokPerUnit} NOK og 1 EUR = {foreign.budgetFx.rates.EUR.nokPerUnit} NOK, 5. oktober 2026. Referansekurser, ikke kortkurs eller fremtidig tollkurs.</p>
 </section></>;
}
