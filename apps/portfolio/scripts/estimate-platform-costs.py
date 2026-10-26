"""Planning scenarios, not a bill cap. No credits/free tier deducted."""
from decimal import Decimal as D
import json
from pathlib import Path
rates=json.loads((Path(__file__).resolve().parents[3]/'docs/platform-pricing-snapshot.json').read_text())
for hours in [30,150,730]:
    memory=D(2)*D(hours)*3600*D(2)*D(rates['memory_gb_second_usd'])
    cpu=D(20000)*D('0.05')*D(rates['active_vcpu_second_usd'])
    requests=D(20000)*D(rates['request_usd'])
    total=D('2.39')+memory+cpu+requests+D('1.00')
    print(json.dumps({'environment_hours_per_service':hours,'web_memory_usd':str(memory.quantize(D('.01'))),'combined_usd':str(total.quantize(D('.01'))),'combined_inr_including_assumed_tax':str((total*100*D('1.18')).quantize(D('.01')))}))
