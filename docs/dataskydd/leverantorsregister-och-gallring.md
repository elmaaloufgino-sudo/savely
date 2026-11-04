# Internt arbetsunderlag: leverantörsregister och gallring

**Fyndaren – arbetsversion 2026-11-04**  
**Status: internt arbetsunderlag. Ägaren har den 4 november 2026 godkänt de föreslagna planeringsperioderna för supportmejl, normala driftloggar och framtida råa aktivitetsdata. Inte en färdig juridisk bedömning och inte avsett som offentlig integritetstext.**

Det här dokumentet skiljer mellan vad som har observerats i aktuell kod/databas, vad leverantörerna själva uppger i sina publicerade villkor och vad Fyndaren ännu måste kontrollera i sina egna konton och avtal.

## 1. Leverantörsregister – nuläge

| Leverantör/tjänst | Observerad användning | Uppgifter som kan lämna webbläsaren eller behandlas | Roll och plats | Status / åtgärd |
|---|---|---|---|---|
| Supabase | Auth, PostgreSQL och appens kund-/erbjudandedata | E-post, konto-ID, sparlista, belöningsuppgifter, autentiserings- och driftmetadata | Projektets primära region är AWS eu-west-1 (Irland). Supabase uppger att konto-/supportuppgifter, telemetri och vissa tjänstmetadata kan behandlas utanför vald region. | Kontrollera och spara gällande DPA, underbiträdeslista, backup-/loggretention och överföringsskydd. Bekräfta vilken juridisk enhet som anges i DPA. |
| GitHub Pages | Statisk webbhosting för webbplatsen | Besökarens IP-adress loggas av GitHub för säkerhetsändamål enligt GitHubs Pages-dokumentation. | GitHub, global infrastruktur; exakt plats/retention för Fyndarens Pages-besöksloggar är inte verifierad. | Kontrollera GitHubs aktuella villkor, roller och retention. Ta inte med en exakt loggperiod innan den har bekräftats. |
| Google Fonts | Fonts laddas från fonts.googleapis.com och fonts.gstatic.com i startsidans kod | Webbläsaren gör förfrågningar till Google; IP-adress och tekniska HTTP-uppgifter kan därför överföras. | Google, global tjänst; faktisk dataplats och retention för denna begäran är inte verifierad i Fyndarens konfiguration. | Överväg att självhosta fontfiler efter kontroll av licens och teknisk implementation. Om extern hämtning behålls ska den beskrivas korrekt. |
| jsDelivr | Supabase JavaScript-bibliotek laddas från CDN i appen | IP-adress, webbläsartyp/-version, referer-domän, begärd CDN-URL, tidpunkt och diagnostik kan behandlas enligt jsDelivrs policy. | Volentio JSD Ltd och CDN-underleverantörer, bland annat Cloudflare, Fastly och Gcore. Global distribution. | Kontrollera aktuell integritetspolicy, underbiträden och eventuella avtalsvillkor. Överväg att paketera biblioteket lokalt i bygget i stället för extern CDN-begäran. |
| Tailwind Play CDN | Startsidan laddar Tailwind från cdn.tailwindcss.com | IP-adress och tekniska anslutningsuppgifter vid scriptbegäran. | Extern CDN/tjänst; exakt databehandlare och retention ej fastställd här. | Tailwinds officiella dokumentation säger att Play CDN är avsett för utveckling, inte produktion. Bygg och leverera statisk CSS från Fyndarens egen webbplats. |
| Externa bildservrar/butiker | Erbjudande- och butiksbilder hämtas med externa bild-URL:er i innehållet | Besökarens webbläsare begär bildfilen direkt; bildservern kan ta emot IP-adress, user-agent, referer och begärd bild-URL. | Flera butiker och bild-/CDN-domäner; varje leverantör kan ha egna roller och underbiträden. Fullständig aktuell domäninventering saknas i detta dokument. | Skapa en maskinellt verifierad lista över unika bilddomäner från aktiva poster och kod. Bedöm rättslig grund, tredjelandsöverföring och om bildproxy/self-hosting är möjligt utan att bryta bildrättigheter eller butiksvillkor. |
| STRATO | Domänrelaterad tjänst och vidarebefordran för hej@fyndaren.se enligt nuvarande policy/konfiguration | E-postadress, meddelandeinnehåll och tekniska e-postmetadata kan behandlas vid vidarebefordran. | STRATO GmbH, Tyskland; exakt produkt/avtal och om STRATO är biträde för respektive flöde behöver kontrolleras. | Hämta kontots produktnamn, DPA och lagrings-/loggvillkor. Bekräfta om vidarebefordran faktiskt går via STRATO eller annan leverantör. |

### Viktiga avgränsningar

- Supabases region Irland betyder inte att all metadata, supportåtkomst eller all behandling garanterat stannar i Irland eller EU. Supabase beskriver vissa behandlingar utanför projektregionen.
- En leverantör som levererar en font, ett script eller en bild kan få tekniska anslutningsuppgifter även om Fyndaren inte skickar e-post eller konto-ID till den leverantören.
- En offentlig integritetspolicy hos en leverantör är inte i sig bevis på att Fyndaren har rätt avtal eller att leverantören är personuppgiftsbiträde i varje enskilt flöde.
- Exakta loggperioder ska inte anges i Fyndarens policy förrän de har verifierats i respektive avtal/kontoinställning.

## 2. Gallringsplan – ägarens planeringsbeslut 2026-11-04

GDPR anger inte en generell tidsgräns för alla uppgifter. Fyndaren måste välja perioder utifrån ändamål, dokumentera motiveringen och införa faktisk automatisk eller manuell gallring. Ägaren har godkänt följande planeringsperioder: 12 månader för supportmejl efter avslutat ärende, 30 dagar för normala egna drift-/felsökningsloggar och högst 90 dagar för framtida råa aktivitetsdata innan aggregering eller radering. Dessa är interna beslutade riktlinjer – inte verifierade nuvarande retentionstider hos leverantörer och inte tidsfrister som GDPR föreskriver.

| Datatyp | Föreslagen regel | När radering/gallring sker | Måste beslutas/verifieras |
|---|---|---|---|
| Konto (e-post, Auth-profil) | Behåll medan kontot är aktivt. Vid raderingsbegäran: radera eller anonymisera utan onödigt dröjsmål efter identitetskontroll och kontroll av eventuella rättsliga hinder. | Kontoradering eller giltig begäran. | Bestäm eventuell inaktivitetsregel; ingen automatisk radering enbart på grund av inaktivitet föreslås innan användaren informerats. |
| Sparlista | Kopplad till kontot och raderas när kontot raderas, om inte användaren separat begär tidigare radering. | Kontoradering eller borttagning av enskilt sparat objekt. | Verifiera kaskadradering och backuphantering. |
| Belönings-/inlösenhistorik | Behåll bara så länge det krävs för att administrera poäng, kundtvister och eventuella bokförings-/rättsliga skyldigheter. Separera uppgifter som måste bevaras från konto-/marknadsföringsprofil. | När respektive ändamål och eventuell lagstadgad bevarandeskyldighet upphör. | Kontrollera om Fyndaren faktiskt bedriver bokföringspliktig belöningshantering och vilken dokumentation som krävs. Ingen generell period fastställs här. |
| Supportmejl | Beslutad planeringsperiod: radera 12 månader efter avslutat ärende, om inte ärendet behöver sparas längre för ett konkret rättsligt anspråk. | 12 månader efter avslutat ärende enligt föreslaget schema. | Ägarens periodbeslut är klart. Kontrollera e-postleverantörens backup/loggar och inför gallringsrutinen. |
| Säkerhets- och driftloggar hos Fyndaren | Beslutad planeringsperiod: 30 dagar för normala egna felsökningsloggar; längre endast vid dokumenterad incident eller rättsligt behov. | Automatisk radering efter beslutad period. | Ägarens periodbeslut är klart för Fyndarens egna loggar. Kontrollera vad Supabase/GitHub/STRATO faktiskt erbjuder och kan styras av Fyndaren. Detta styr inte automatiskt leverantörernas egna loggar. |
| Tillfälliga app-/webbläsarcacher | Rensas vid versionsbyte/utgång och genom webbläsarens cachehantering; ska inte användas som kundprofil. | Cacheversion ersätts eller webbläsaren rensar lagringen. | Verifiera service worker-cache keys, versionsbyte och om någon personlig information någonsin cachas. |
| Samtyckesbevis (framtida) | Behåll minsta bevisdata så länge samtycket används och under en dokumenterad period efter återkallelse för att kunna visa vad som gällde och förhindra ny kontakt. | När bevis-/ansvarsändamålet upphör. | Bestäm en separat period och rättslig motivering innan samtyckesfunktionen byggs. |
| Nyhetsbrevslista (framtida) | Aktiv prenumeration så länge samtycket är aktivt. Efter avregistrering: ta bort från utskickslistan men behåll minsta spärr-/bevisuppgift så att personen inte av misstag läggs till igen. | Återkallat samtycke/avregistrering. | Välj e-postleverantör och bestäm suppression-listans fält och retention. |
| Push-token (framtida) | Behåll endast medan prenumerationen är aktiv; radera vid avregistrering, ogiltig token eller återkallad behörighet när detta upptäcks. | Avregistrering eller invalid token. | Bestäm teknisk kontroll och pushleverantör innan funktionen införs. |
| Råa aktivitetsdata (framtida) | Samla inte in om aggregerad statistik räcker. Om nödvändigt: beslutad planeringsperiod högst 90 dagar och därefter aggregera eller radera. | Automatisk gallring efter beslutad period. | Periodbeslutet är klart. DPIA-/intresseavvägning och tydlig ändamålsbeskrivning krävs fortfarande innan insamling. |

## 3. Tekniska rekommendationer som minskar exponeringen

1. Bygg Tailwind till en statisk CSS-fil och sluta ladda Play CDN i produktion.
2. Överväg att självhosta Google Fonts, efter licenskontroll.
3. Paketera Supabase JS lokalt i appen om byggflödet tillåter det.
4. Inventera externa bilddomäner från aktiva produktposter och granska dem som en separat kategori. Ändra inte produktbilds-URL:er utan separat godkännande och kontroll av bildrättigheter.
5. Inför en gallringsrutin med ansvarig, körfrekvens, logg över genomförd gallring och hantering av säkerhetskopior.
6. Bygg inte kundprofilering, nyhetsbrev eller push innan samtycke, ändamål, rättslig grund, avregistrering och gallringsregler är beslutade.

## 4. Ägarbeslut som krävs innan offentlig policy uppdateras

- Bekräfta att personuppgiftsansvarig och kontaktuppgifter i policyn är korrekta.
- Bekräfta om STRATO fortfarande hanterar både domän och e-postvidarebefordran.
- Bekräfta att Supabase DPA är accepterat/ingår och spara aktuell underbiträdeslista.
- Inför den godkända planeringsperioden 12 månader för supportmejl och 30 dagar för normala egna drift-/felsökningsloggar; verifiera e-postleverantörens respektive driftleverantörernas egna retention separat.
- Bekräfta hur belöningshistorik ska hanteras och om bokföringsregler blir tillämpliga.
- Ägarens gallringsperioder är beslutade som planeringsriktlinjer; de måste nu omsättas i tekniska rutiner och verifieras. Bestäm om externa fonts/CDN-skript ska tas bort eller självhostas.
- Genomför en faktisk nätverks-/webbläsarkontroll av cookies, localStorage, IndexedDB, Cache API, service worker och externa anrop innan cookieinformationen markeras som verifierad.

## 5. Källor för intern kontroll

- IMY – lagringsminimering och gallring: https://www.imy.se/vanliga-fragor-och-svar/hur-lange-far-vi-spara-uppgifter/
- Supabase – Data Residency and Transfers FAQ: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Supabase – Data Processing Addendum: https://supabase.com/legal/customer-resources/data-processing-addendum
- GitHub Pages – IP-adresser loggas vid besök: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- jsDelivr – Privacy Policy: https://github.com/jsdelivr/jsdelivr/blob/master/Privacy%20Policy.md
- jsDelivr – Sub-processors: https://github.com/jsdelivr/jsdelivr/blob/master/Sub-Processors.md
- Tailwind CSS – Play CDN är avsett för utveckling, inte produktion: https://tailwindcss.com/docs/installation/play-cdn
- STRATO – Integritetspolicy: https://www.strato.se/integritetspolicy/



## 6. Teknisk kontroll mot aktuell `main` – 2026-11-04

Kontrollen är en statisk kodgranskning av GitHub-grenen `main`, inte ett live-webbläsartest.

### Observerat i koden

- `app.html` skapar Supabase-klienten med `window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)` utan egna auth-/storagealternativ. Supabase JS standardinställningar används därför; klientens sessionspersistens behöver beskrivas och verifieras mot den SDK-version som faktiskt laddas.
- Appkoden innehåller inga direkta anrop/referenser till `document.cookie`, `localStorage`, `sessionStorage` eller `indexedDB`. Det betyder inte att inga sådana lagringsmekanismer används av bibliotek eller webbläsare.
- Ingen cookie-/samtyckesdialog eller kod för att spara val av icke-nödvändiga cookies identifierades i `app.html`.
- `sw.js` skapar Cache API-cachen `fyndaren-v22`, lägger appens egna skalresurser i cachen och rensar äldre Fyndaren-cachar vid aktivering. Den hanterar endast GET-förfrågningar till samma origin; externa resurser, databas, inloggning, typsnitt och script går direkt till nätverket enligt kommentar och kod.
- Supabase JS laddas från jsDelivr. Google Fonts laddas från Google Fonts. Det innebär externa nätverksanrop från besökarens webbläsare.
- Det här kodutdraget visar inte en fullständig inventering av bilddomäner eftersom erbjudandebilder och deras URL:er kan komma från databasinnehåll. Den listan måste tas fram från aktiva poster och kompletteras med en nätverksinspektion.
- Registreringsfunktionen i `main` accepterar fortfarande lösenord med minst 6 tecken. PR #79 med klientvalidering på 12 tecken är ännu inte sammanslagen. Den ändringen är dessutom inte en ersättning för serverinställd lösenordspolicy i Supabase Auth.

### Supabase-plan och retention som kunde verifieras

Projektinformationen visar att Savely-projektet är aktivt i region `eu-west-1` och att organisationen har **Free-planen**. Supabases aktuella planinformation anger för Free:

- API-/databasloggar: 1 dags åtkomst/retention.
- Auth Audit Logs: 1 timmes åtkomst.
- Automatiska databasbackuper: ingår inte i Free-planen.
- Log Drains: ingår inte i Free-planen.

Supabase rekommenderar att Free-projekt regelbundet exporterar databasen och förvarar säkerhetskopior på annan plats. Detta är leverantörens plannivå, inte Fyndarens egen 30-dagars gallringsregel. Fyndaren kan inte lova 30 dagars tillgänglighet för Supabases loggar på nuvarande plan.

**Praktisk konsekvens:** 30-dagarsperioden gäller endast Fyndarens egna loggar om sådana införs och kontrolleras av Fyndaren. Den ska inte skrivas som retentionstid för Supabase. För support- och säkerhetsutredningar måste Fyndaren därför ha egna minimerade loggar och/eller acceptera att Supabases tillgängliga logghistorik är kortare.

### Kvar att verifiera i drift

- Genomför webbläsartest på `https://fyndaren.se` och `https://fyndaren.se/app.html`: DevTools Network, Application/Storage och Cookies. Kontrollera både utloggad och inloggad användare, samt efter avslag på frivilliga val när samtyckesfunktionen finns.
- Exportera den faktiska listan över externa bilddomäner från aktiva erbjudanden och verifiera samtliga nätverksanrop.
- Kontrollera exakt vilka Supabase Auth-/sessioninställningar som är aktiva i Dashboard. Koden ensam bevisar inte den fullständiga serverkonfigurationen.
- Skapa en schemalagd, krypterad och åtkomstbegränsad databasexport utanför Supabase Free om verksamheten behöver återställningsmöjlighet. Testa återläsning innan lösningen betraktas som backup.
- Kontrollera e-postleverantörens faktiska avtal, vidarebefordringsflöde, backup och gallring i STRATO-kontot. Detta går inte att läsa ut från GitHub eller Supabase-projektets metadata.

### Källor till planuppgifterna

- Supabase Pricing – Free-planens loggretention, Auth Audit Logs, automatiska backuper och Log Drains: https://supabase.com/pricing
- Supabase Database Backups – Free-projekt saknar automatiska backuper och rekommenderas att exportera databasen själva: https://supabase.com/docs/guides/platform/backups
- Supabase Log Query usage – loggtillgänglighet och begränsningar: https://supabase.com/docs/guides/platform/manage-your-usage/logs-query
