from services.ai_mom import generate_mom_from_transcripts
import traceback

try:
    print(generate_mom_from_transcripts(["hello", "world"]))
except Exception as e:
    traceback.print_exc()
