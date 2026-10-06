const layer0Item = {
  type:'object',
  properties:{
    code:{type:'string',enum:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')},
    relevance_en:{type:'string'},
    relevance_zh:{type:'string'},
    relation_to_whole_en:{type:'string'},
    relation_to_whole_zh:{type:'string'}
  },
  required:['code','relevance_en','relevance_zh','relation_to_whole_en','relation_to_whole_zh'],
  additionalProperties:false
};

export const READING_SCHEMA = {
  type:'object',
  properties:{
    language_detected:{type:'string',enum:['en','zh','mixed','other']},
    surface_meaning_en:{type:'string'},
    surface_meaning_zh:{type:'string'},
    canonical_reading_en:{type:'string'},
    canonical_reading_zh:{type:'string'},
    whole_form_mechanism_en:{type:'string'},
    whole_form_mechanism_zh:{type:'string'},
    structural_evidence:{type:'array',items:{type:'string'}},
    layer0_relevance:{type:'array',items:layer0Item},
    incremental_information_en:{type:'string'},
    incremental_information_zh:{type:'string'},
    uncertainties_en:{type:'string'},
    uncertainties_zh:{type:'string'},
    structural_evidence_strength:{type:'string',enum:['open','limited','moderate','strong']},
    later_outcome_confirmation:{type:'string',enum:['not_evaluated']},
    reality_boundary_en:{type:'string'},
    reality_boundary_zh:{type:'string'}
  },
  required:[
    'language_detected','surface_meaning_en','surface_meaning_zh','canonical_reading_en','canonical_reading_zh',
    'whole_form_mechanism_en','whole_form_mechanism_zh','structural_evidence','layer0_relevance',
    'incremental_information_en','incremental_information_zh','uncertainties_en','uncertainties_zh',
    'structural_evidence_strength','later_outcome_confirmation','reality_boundary_en','reality_boundary_zh'
  ],
  additionalProperties:false
};

function assertString(obj,key){ if(typeof obj[key] !== 'string') throw new Error(`Invalid or missing ${key}`); }

export function validateModelReading(value){
  if(!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Reading must be an object');
  for(const key of READING_SCHEMA.required) if(!(key in value)) throw new Error(`Invalid or missing ${key}`);
  const extra=Object.keys(value).filter(k=>!READING_SCHEMA.required.includes(k));
  if(extra.length) throw new Error(`Unexpected field ${extra[0]}`);
  if(!['en','zh','mixed','other'].includes(value.language_detected)) throw new Error('Invalid language_detected');
  for(const key of READING_SCHEMA.required.filter(k=>!['structural_evidence','layer0_relevance','structural_evidence_strength','later_outcome_confirmation','language_detected'].includes(k))) assertString(value,key);
  if(!Array.isArray(value.structural_evidence) || value.structural_evidence.some(x=>typeof x!=='string')) throw new Error('Invalid structural_evidence');
  if(!Array.isArray(value.layer0_relevance)) throw new Error('Invalid layer0_relevance');
  for(const item of value.layer0_relevance){
    if(!item || typeof item!=='object') throw new Error('Invalid layer0_relevance item');
    const req=layer0Item.required;
    for(const key of req) if(!(key in item) || typeof item[key]!=='string') throw new Error(`Invalid layer0_relevance.${key}`);
    if(!/^[A-Z]$/.test(item.code)) throw new Error('Invalid layer0_relevance.code');
    if(Object.keys(item).some(k=>!req.includes(k))) throw new Error('Unexpected layer0_relevance field');
  }
  if(!['open','limited','moderate','strong'].includes(value.structural_evidence_strength)) throw new Error('Invalid structural_evidence_strength');
  if(value.later_outcome_confirmation!=='not_evaluated') throw new Error('Invalid later_outcome_confirmation');
  return value;
}
