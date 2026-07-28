import json
import math

def fix(obj):
    if isinstance(obj, dict):
        return {k: fix(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix(i) for i in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    return obj

try:
    # Using demjson or simple replace because json.load will fail on NaN in standard json module!
    # Wait, standard json module ACTUALLY parses NaN to float('nan').
    with open('backend/data/plans.json', 'r') as f:
        d1 = json.load(f)
    with open('backend/data/dataset.json', 'r') as f:
        d2 = json.load(f)
        
    d1 = fix(d1)
    d2 = fix(d2)
    
    with open('backend/data/plans.json', 'w') as f:
        json.dump(d1, f)
    with open('backend/data/dataset.json', 'w') as f:
        json.dump(d2, f)
    print("Fixed")
except Exception as e:
    print(e)
