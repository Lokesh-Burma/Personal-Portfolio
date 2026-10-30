// Standard Nano Banana 2.1 pricing checked 2026-10-30; estimates, never invoice totals.
export const imagePricing=Object.freeze({model:'gemini-nano-banana-2.1',asOf:'2026-10-30',source:'https://ai.google.dev/gemini-api/docs/pricing',estimatedMaximumUSD:0.08,indicativeUSDtoINR:95,dailyLimit:1,monthlyLimit:5});
export function refinementInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='instructions')||typeof input.instructions!=='string')throw Object.assign(new Error('Expected refinement instructions.'),{status:400});
 const instructions=input.instructions.trim();
 if(instructions.length<3||Buffer.byteLength(instructions,'utf8')>600||/[\u0000-\u001f\u007f]/.test(instructions))throw Object.assign(new Error('Describe the change in 3–600 UTF-8 bytes without control characters.'),{status:400});
 return instructions;
}
