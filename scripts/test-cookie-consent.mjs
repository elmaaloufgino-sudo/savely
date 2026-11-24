import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code = readFileSync(new URL('../cookie-consent.js',import.meta.url),'utf8');
function load(value) {
  const storage = new Map([['fyndaren-active-tab','codes'],['fyndaren-deals-preview-v1','{}']]);
  if(value!==undefined)storage.set('fyndaren-consent-v1',JSON.stringify(value));
  const window = {};
  vm.runInNewContext(code,{window,URL,Date,localStorage:{getItem:k=>storage.get(k)??null,removeItem:k=>storage.delete(k)},document:{readyState:'loading',addEventListener(){}}});
  return {consent:window.FyndarenConsent,storage};
}
const link='https://www.awin1.com/pclick.php?p=123&a=456&m=789&clickref=private&cons=1';
const denied={version:1,at:Date.now(),preferences:false,affiliate:false,newsletter:false};
const granted={...denied,preferences:true,affiliate:true,newsletter:true};
for(const value of [undefined,denied,{...granted,at:Date.now()-181*86400000},{...granted,affiliate:'true'}]){
  const {consent,storage}=load(value);
  assert.equal(consent.allowed('affiliate'),false);
  assert.equal(consent.allowed('newsletter'),false);
  assert.equal(consent.allowed('preferences'),false);
  assert.equal(storage.has('fyndaren-active-tab'),false);
  assert.equal(storage.has('fyndaren-deals-preview-v1'),false);
  const url=new URL(consent.affiliateUrl(link));
  assert.equal(url.searchParams.get('cons'),'0');
  assert.equal(url.searchParams.has('clickref'),false);
  assert.equal(url.searchParams.get('p'),'123');
  assert.equal(consent.affiliateUrl('https://tracker.example/x','https://shop.example/item'),'https://shop.example/item');
  assert.equal(consent.affiliateUrl('https://awin1.com.evil.example/x'),'#fynd-cookie-settings');
}
const {consent,storage}=load(granted);
assert.equal(consent.allowed('affiliate'),true);
assert.equal(consent.allowed('newsletter'),true);
assert.equal(storage.has('fyndaren-active-tab'),true);
const allowed=new URL(consent.affiliateUrl(link));
assert.equal(allowed.searchParams.get('cons'),'1');
assert.equal(allowed.searchParams.get('clickref'),'private');
assert.equal(consent.affiliateUrl('javascript:alert(1)'),'#fynd-cookie-settings');
console.log('Cookie consent tests passed');
