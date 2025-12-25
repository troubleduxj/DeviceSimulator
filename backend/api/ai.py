from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import requests
import json
from typing import List, Dict, Any, Optional

router = APIRouter()

class AIRequest(BaseModel):
    provider: str
    apiKey: str
    model: str
    baseUrl: Optional[str] = None
    prompt: str
    proxyUrl: Optional[str] = None # Add proxyUrl

@router.post("/proxy")
async def proxy_ai_request(req: AIRequest):
    print(f"Received AI Proxy Request: Provider={req.provider}, Model={req.model}, BaseUrl={req.baseUrl}, Proxy={req.proxyUrl}")
    
    proxies = {}
    if req.proxyUrl:
        proxies = {
            "http": req.proxyUrl,
            "https": req.proxyUrl
        }

    try:
        if req.provider == 'deepseek':
            base_url = req.baseUrl or "https://api.deepseek.com"
            url = f"{base_url.rstrip('/')}/chat/completions"
            print(f"Forwarding to: {url}")
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {req.apiKey}"
            }
            payload = {
                "model": req.model,
                "messages": [
                    {"role": "system", "content": "You are a JSON generator. Output strictly JSON."},
                    {"role": "user", "content": req.prompt}
                ],
                "stream": False
            }
            
            # Increased timeout to 60s
            print("Sending request to DeepSeek...")
            response = requests.post(url, json=payload, headers=headers, timeout=60, proxies=proxies)
            print(f"DeepSeek Response: Status={response.status_code}")
            
            if response.status_code != 200:
                print(f"DeepSeek Error Body: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"DeepSeek Error: {response.text}")
                
            data = response.json()
            return data
            
        elif req.provider == 'gemini':
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{req.model}:generateContent?key={req.apiKey}"
            print(f"Forwarding to Gemini: {url}")
            
            headers = { "Content-Type": "application/json" }
            payload = {
                "contents": [{
                    "parts": [{"text": req.prompt}]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            
            print("Sending request to Gemini...")
            response = requests.post(url, json=payload, headers=headers, timeout=60, proxies=proxies)
            print(f"Gemini Response: Status={response.status_code}")
            
            if response.status_code != 200:
                print(f"Gemini Error Body: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Gemini Error: {response.text}")
                
            data = response.json()
            # Normalize response to match DeepSeek/OpenAI format for easier frontend handling?
            # Or just return raw and let frontend handle. Frontend expects specific format.
            # Let's keep it raw but frontend needs to know how to parse.
            return data

        else:
             raise HTTPException(status_code=400, detail=f"Provider {req.provider} not supported by proxy")
            
    except requests.exceptions.Timeout:
        print("AI Provider Timed Out")
        raise HTTPException(status_code=504, detail="AI Provider Timed Out (60s)")
    except Exception as e:
        print(f"AI Proxy Error Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
