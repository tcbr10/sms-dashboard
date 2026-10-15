import {ContactField} from './settings';
// Message variables: {שם} is replaced by the recipient's contact field with that name, {שם|לקוח יקר} uses the text after
// the bar when the field is empty, and {טלפון} is the recipient's number. Used by dashboard sends and bot replies.
export const PHONE_VARIABLE = 'טלפון';
const VARIABLE = /\{([^{}|\n]{1,30})(?:\|([^{}\n]{0,60}))?\}/g;
// A non-global copy: test() on the global pattern would leave lastIndex behind for the next matchAll().
const ANY_VARIABLE = new RegExp(VARIABLE.source);
export function hasVariables(text: string): boolean { return ANY_VARIABLE.test(text); }
export function unknownVariables(text: string, fields: ContactField[]): string[] {
 const names = new Set(fields.map(f => f.label)); names.add(PHONE_VARIABLE);
 return [...new Set([...text.matchAll(VARIABLE)].map(m => m[1].trim()).filter(n => !names.has(n)))];
}
const localNumber = (n: string) => n.startsWith('+972') ? '0' + n.slice(4) : n;
export function render(text: string, fields: ContactField[], contact: Record<string,string>|null, peer: string): string {
 return text.replace(VARIABLE, (_all, rawName: string, fallback: string|undefined) => {
  const name = rawName.trim(); if (name === PHONE_VARIABLE) return localNumber(peer);
  const field = fields.find(f => f.label === name); const value = field && contact ? String(contact[field.id] ?? '').trim() : '';
  return value || (fallback ?? '').trim();
 });
}
