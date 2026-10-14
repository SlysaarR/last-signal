// Original game reconstructions of object types. Sources explain construction;
// their museum dates/provenance are not assigned to randomly generated finds.
const bm=id=>'https://www.britishmuseum.org/collection/object/'+id;
const pas=id=>'https://finds.org.uk/pas/recorded-find/'+id;
const home={field:1.8,orchard:2.2,forest:1.3,beach:.55,river:.8};
const dress={field:1.8,fair:2,trail:1.5,beach:.65};
const trade={fair:2.5,trail:2.2,field:1.2,beach:.45,river:.8};
const jewel={fair:1.7,trail:1.4,orchard:1.2,beach:.9};
const make=(name,shape,kind,price,rarity,findMaterial,findRegions,findDescription,source)=>({
 name,shape,kind,price,rarity,metal:'color',icon:kind==='jewel'?'◇':'◈',
 contentPack:'finds048',findMaterial,findRegions,findDescription,source,
 note:'Ігрова реконструкція типу предмета. Точний вік і походження цієї знахідки не встановлено.'
});
export const findCatalog=[
 make('Плаский ґудзик із вушком','shank-button','relic',48,1,'brass',dress,'На звороті — вушко для пришивання. Лицьова частина суцільна: нитка проходила через кріплення позаду.',pas('CORN-D755C7')),
 make('Опуклий ґудзик','domed-button','relic',56,1,'bronze',dress,'Опукла головка та вушко зі зворотного боку. Форма кріплення допомагає відрізнити ґудзик від монетоподібного диска.',pas('SWYOR-41FBA4')),
 make('Прямокутна пряжка','rect-buckle','relic',52,1,'brass',dress,'Рамка пропускала ремінець, а рухомий язичок утримував його за отвір. Усередині рамки є справжній просвіт.', 'https://finds.org.uk/buckles'),
 make('Дворамкова пряжка','double-buckle','relic',62,1,'bronze',dress,'Дві рамки розділені середньою перекладиною з язичком. Такі застібки трапляються з овальними й прямокутними рамками.', 'https://finds.org.uk/buckles'),
 make('Свинцева пломба','cloth-seal','relic',44,1,'lead',trade,'Сполучені свинцеві диски затискали на тканині. Відбитки могли стосуватися перевірки чи обліку товару; позначення тут умовні.', 'https://finds.org.uk/cloth-seals'),
 make('Порожнистий ключ','barrel-key','relic',50,1,'bronze',home,'Порожнистий стрижень і борідка з вирізами — робочі частини ключа. Їхня форма відповідала механізму замка.',bm('H_1836-0901-127')),
 make('Наперсток','thimble','relic',54,1,'brass',home,'Порожнистий ковпачок захищав палець під час шиття. Дрібні заглибини на поверхні допомагали втримувати голку.',bm('H_1921-0217-4')),
 make('Бубонець','crotal-bell','relic',130,2,'bronze',{...dress,trail:2,forest:1.5},'Порожнистий корпус із вушком та звуковою щілиною. Усередині такого бубонця містилася рухома кулька, яка створювала звук.',pas('IOW-16AA95')),
 make('Наконечник ременя','strap-end','relic',48,1,'bronze',dress,'Металева накладка на кінці ременя. Заклепки тримали шкіру між пластинами; тильний бік міг бути простішим за оздоблений лицевий.',bm('H_1888-0719-163')),
 make('Фрагмент ложки','spoon-fragment','relic',42,1,'pewter',home,'Збережена увігнута частина ложки та короткий уламок ручки. Кривина відрізняє її від пласкої металевої пластини.',bm('H_1964-0702-39')),
 make('Натільний хрестик','cross-pendant','jewel',95,1,'bronze',jewel,'Підвіска у формі хреста з вушком. Кільця й крапки — приклад простого оздоблення; самого силуету недостатньо для точного датування.',bm('H_1879-0524-62')),
 make('Овальна підвіска','oval-pendant','jewel',100,1,'copper',jewel,'Пласка овальна основа з кільцем для підвішування. Передній бік оздоблений, а на звороті видно простішу поверхню.',bm('W_2007-6001-14388')),
 make('Кільцева фібула','annular-brooch','jewel',190,2,'bronze',{...jewel,field:1.8,trail:2},'Кільцева застібка з голкою для скріплення тканини. Голка перетинає відкритий центр і спирається на край кільця.',bm('H_1936-0511-9')),
 make('Перстень із щитком','bezel-ring','jewel',195,2,'bronze',jewel,'Обідок переходить у розширений щиток. На подібних перснях розміщували врізані зображення; орнамент цієї моделі умовний.',bm('A_1880-3790-q'))
];
export const findMaterials={brass:'Мідний сплав',bronze:'Мідний сплав',copper:'Мідний сплав',lead:'Свинець',pewter:'Світлий метал'};
