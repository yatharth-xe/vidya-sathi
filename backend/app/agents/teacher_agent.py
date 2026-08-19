import os

try:
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY", "")
    if api_key:
        genai.configure(api_key=api_key)
except ImportError:
    genai = None
    api_key = ""

def generate_classroom_insights(classroom_id: int) -> str:
    prompt = f"You are Vidya Sathi's Teacher Assistant. Generate analytics insights, summarizing key student risk indicators and common weak topics for classroom ID {classroom_id}."
    
    if not api_key:
        return "Mock Agent Insights: 3 students (Aarav, Divya, Rohan) are currently identified as high-risk due to missing submissions. Common weak topic: Quadratic Equations."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return "Unable to generate insights at this time. Standard advice: Focus on reviewing homework completion rates."
