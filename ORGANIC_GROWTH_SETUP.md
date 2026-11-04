# Fyndaren – organisk tillväxt och driftsättning

## Vad koden förbereder

- Varje aktivt erbjudande får en statisk sida under `/fynd/<butik-produkt-id>/` med unik sidtitel, metabeskrivning, canonical-URL och Open Graph-/Twitter-metadata.
- Sidorna genereras från offentligt läsbara, aktiva rader i `public.deals`; gamla erbjudanden med passerat `valid_to` tas inte med.
- GitHub Actions uppdaterar sidorna och `sitemap.xml` var sjätte timme, samt kan startas manuellt.
- Appens produktvy får en dela-knapp. Den använder delningsdialogen på telefoner eller kopierar länken.
- `app.html?deal=<id>` öppnar rätt erbjudande direkt i produktvyn.
- Admin visar samtliga sju kategorier. Nya erbjudanden måste ha direkt butikslänk och datum för senaste kontroll.
- Det tidigare mailto-nyhetsbrevet är borttaget. Sidan lovar inte längre att en prenumeration registreras när så inte sker.

## Efter att PR har granskats och mergats

1. Öppna GitHub → Actions → **Refresh public deal pages** → **Run workflow**. Kontrollera att workflow kör färdigt och att katalogen `fynd/` samt `sitemap.xml` uppdateras på `main`.
2. Öppna en genererad fyndsida och kontrollera att sidan, priset, villkoren och butikslänken stämmer. Kontrollera även att social förhandsvisning visar rätt produktbild och titel.
3. Lägg till webbplatsen som domänegendom i Google Search Console och verifiera domänen via DNS hos domänleverantören. Skicka sedan in `https://fyndaren.se/sitemap.xml`. Kontrollera därefter indexeringsrapporterna regelbundet.
4. Skapa ett kostnadsfritt Brevo-konto och en inbäddad anmälningsblankett med GDPR-samtycke, länk till Fyndarens integritetspolicy och dubbel e-postbekräftelse. Välj en lista och kopiera Brevos embed-kod. Först då ska formuläret läggas in på startsidan. Brevos kostnadsfria plan har enligt deras aktuella hjälpcenter 300 e-postutskick per dag; villkoren kan ändras.
5. Före publicering av nya fynd: verifiera pris, villkor, datum, direktlänk och produktbild. För annonserade prissänkningar måste jämförelsepriset kontrolleras mot butikens lägsta pris under de 30 dagarna före prissänkningen. Fyndarens befintliga prisuppgifter behöver granskas separat innan vi kan säga att samtliga följer detta.

## Begränsningar och säkerhet

- Ingen databas, tabell, policy eller befintlig erbjudanderad ändras av denna ändring.
- GitHub Actions behöver vara aktiverat i repo:t och tillåtas skriva till `main`. Om organisationens inställningar blockerar workflow-skrivning kommer genereringen att misslyckas med ett tydligt fel i Actions-loggen.
- GitHub Pages måste publicera från `main`/rot för att de genererade URL:erna ska bli tillgängliga på den befintliga domänen.
- Nyhetsbrevet är medvetet inte aktivt innan en riktig leverantörsblankett och samtyckesflöde har konfigurerats.
- En sida med unika metadata garanterar inte att Google indexerar eller visar den i sökresultaten. Search Console behövs för att följa upp detta.
