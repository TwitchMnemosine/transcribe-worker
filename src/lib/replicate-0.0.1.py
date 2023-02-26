import subprocess
import sys
import os
import glob
import json

os.environ['REPLICATE_API_TOKEN'] = 'xxxxxxxxx'

import replicate

model = replicate.models.get("openai/whisper")
version = model.versions.get("30414ee7c4fffc37e260fcab7842b5be470b9b840f2b608f5baa9bbef9a259ed")

os.chdir(sys.argv[1])
files = glob.glob("*.mp3")
files.sort()

lastHighDuration = 0
listSegments = []

for file in files:
  inputs = {
    'audio': open("./" + file, "rb"),
    'model': "large",
    'transcription': "srt",
    'language': 'es',
    'translate': False,
    'temperature': 0,
    'suppress_tokens': "-1",
    'condition_on_previous_text': True,
    'temperature_increment_on_fallback': 0.2,
    'compression_ratio_threshold': 2.4,
    'logprob_threshold': -1,
    'no_speech_threshold': 0.6,
  }

  output = version.predict(**inputs)
  segmnts = output['segments']
  for i in range(len(segmnts)):
    if(i == 0) :
      segmnts[i]['start'] = lastHighDuration #+ segmnts[i]['start']
      segmnts[i]['end'] = segmnts[i]['start'] + segmnts[i]['end']
      listSegments.append(segmnts[i])
    if(i != 0) :
      saveStart = segmnts[i]['start']
      segmnts[i]['start'] = segmnts[i-1]['end']
      segmnts[i]['end'] =  segmnts[i]['start'] + abs(segmnts[i]['end'] - saveStart)
      listSegments.append(segmnts[i])
    lastHighDuration = int(segmnts[-1]['end'])

print(json.dumps({"segments": listSegments}))
  
