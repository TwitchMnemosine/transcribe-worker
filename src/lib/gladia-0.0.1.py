import requests
import glob
import json
import time
import sys
import os

gladiaApiKey = os.getenv('GLADIA_API_KEY')

os.chdir(sys.argv[1])
files = glob.glob("*.mp3")
files.sort()

lastHighDuration = 0
listSegments = []

for file in files:
  headers = {
      'accept': 'application/json',
      'x-gladia-key': gladiaApiKey,
  }

  files = {
      'audio': (file, open("./" + file, "rb"), 'audio/mpeg'),
      'language': (None, 'spanish'),
      'language_behaviour': (None, 'automatic single language'),
      'output_format': (None, 'json'),
  }

  response = requests.post('https://api.gladia.io/audio/text/audio-transcription/', headers=headers, files=files)
  segmnts = response.json()['prediction']
  for i in range(len(segmnts)):
    if(i == 0) :
      segmnts[i]['time_begin'] = segmnts[i]['time_begin'] + lastHighDuration
      segmnts[i]['time_end'] = segmnts[i]['time_end'] + lastHighDuration
      listSegments.append(segmnts[i])
    if(i != 0) :
      segmnts[i]['time_begin'] = segmnts[i]['time_begin'] + lastHighDuration
      segmnts[i]['time_end'] =  segmnts[i]['time_end'] + lastHighDuration
      listSegments.append(segmnts[i])
  lastHighDuration = segmnts[-1]['time_end']
  time.sleep(20)
  
with open(sys.argv[1] + "transcript.json", 'w') as f:
  json.dump({"segments": listSegments}, f)
