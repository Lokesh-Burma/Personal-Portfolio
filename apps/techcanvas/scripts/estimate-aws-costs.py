#!/usr/bin/env python3
"""Offline planning calculator. Reads a saved public price snapshot; calls no AWS APIs."""
import argparse
import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

D=Decimal
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--attempts',type=int,default=300,help='Monthly billed AI attempts, including retries (proposed application cap: 300)')
parser.add_argument('--usd-inr',type=D,default=D('100'),help='Illustrative exchange rate, not a live FX quote')
parser.add_argument('--tax-rate',type=D,default=D('0.18'),help='Illustrative tax rate; verify actual billing treatment')
parser.add_argument('--json',action='store_true')
parser.add_argument('--snapshot',type=Path,default=Path(__file__).resolve().parents[1]/'docs/aws-pricing-sydney.json')
args=parser.parse_args()
if args.attempts<0 or args.usd_inr<=0 or not D('0')<=args.tax_rate<=D('1'):parser.error('Use non-negative attempts, positive FX, and a tax rate between 0 and 1.')
snapshot=json.loads(args.snapshot.read_text());r={k:D(v['usd']) for k,v in snapshot['rates'].items()}
attempts=D(args.attempts)
# Gross conservative estimate: no credits or free usage allowances are deducted.
# Input billing assumes 6000 tokens per attempt; runtime enforces 6000 serialized UTF-8 bytes, not a model token count.
# All traffic/retention parameters below are assumptions, not measured production usage.
api=D('10000');viewer=D('10000');reads=D('25000');writes=D('10000')
lines={
 'Bedrock (6000 input + 1600 output tokens/attempt)':attempts*(D('6')*r['bedrock_input_1k']+D('1.6')*r['bedrock_output_1k']),
 'Lambda (512 MB worker, 60 s/attempt; 512 MB API, 100 ms/request)':(attempts*D('0.5')*D('60')+api*D('0.5')*D('0.1'))*r['lambda_gb_second']+(attempts+api)*r['lambda_request'],
 'HTTP API (10000 requests)':api*r['http_api_request'],
 'DynamoDB (1 GB, 25000 RRU, 10000 WRU)':r['ddb_storage_gb']+reads*r['ddb_read']+writes*r['ddb_write'],
 'DynamoDB PITR (1 GB protected)':r['ddb_pitr_gb'],
 'S3 access logs and bootstrap artifacts (1 GB, 10000 PUT, 10000 GET)':r['s3_storage_gb']+D('10000')*(r['s3_put']+r['s3_get']),
 'SQS FIFO (1000000 operations incl. empty polling allowance)':D('1000000')*r['sqs_request'],
 'S3 (2 GB, 5000 PUT/LIST, 10000 GET)':D('2')*r['s3_storage_gb']+D('5000')*r['s3_put']+D('10000')*r['s3_get'],
 'Cognito Essentials (1 active owner)':r['cognito_mau'],
 'CloudFront (2 GB out, 10000 HTTPS requests; Australia viewer rates)':D('2')*r['cdn_gb_out']+viewer*r['cdn_request'],
 'Logs (0.1 GB ingest, 0.1 GB average retained)':D('0.1')*(r['log_ingestion_gb']+r['log_storage_gb']),
 'Planning reserve: backups, alarms, artifacts and geographic variation':D('0.50'),
}
total=sum(lines.values(),D('0'));before_tax=total*args.usd_inr;tax=before_tax*args.tax_rate;gross=before_tax+tax
money=lambda value:str(value.quantize(D('0.01'),rounding=ROUND_HALF_UP))
result={'status':'planning_only_not_deployed','architecture':'owner_only_http_api_without_waf','region':snapshot['region'],'model_id':snapshot['model_id'],'attempts':args.attempts,'input_limit_bytes':6000,'input_tokens_billing_assumption':6000,'usd_inr_assumption':str(args.usd_inr),'tax_rate_assumption':str(args.tax_rate),'line_items_usd':{k:money(v) for k,v in lines.items()},'total_usd':money(total),'estimated_inr_including_assumed_tax':money(gross),'headroom_to_inr_1000':money(D('1000')-gross),'within_planning_target':gross<=D('1000')}
if args.json:print(json.dumps(result,indent=2))
else:
 for key,value in lines.items():print(f'{key}: USD {money(value)}')
 print(f'Total: USD {money(total)} | INR {money(gross)} with illustrative FX/tax | headroom INR {money(D("1000")-gross)}')
 print('No AWS resources were created. Usage and exchange rates can change the result. This is not a hard billing cap.')
