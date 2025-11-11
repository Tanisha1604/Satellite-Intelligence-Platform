# --- Core Python Libraries for Voice I/O ---
import pyttsx3 
import speech_recognition as sr
import datetime
import sys
import time
import requests
import json
import os

# --- Configuration for Gemini API (Used for smart command fallback) ---
# NOTE: This API Key is empty for security, but you would need a key

API_KEY = "AIzaSyBqlJrgKd4G8tYl3kBO73cjs5_KgZP3ytM"
GEMINI_TEXT_API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}"

# --- API Keys for MOSDAC Data Fetching (Alternative APIs) ---
# Get free API key from https://openweathermap.org/api
OPENWEATHER_API_KEY = "16b062bd8aacb949ea23a5dfb83883d8"  
# Get free API key from https://api.nasa.gov/
NASA_API_KEY = ""  # Replace with your key

# --- Assistant Persona Configuration ---
SYSTEM_PROMPT = "You are Jarvis, a sophisticated AI assistant for the MOSDAC (Meteorological and Oceanographic Satellite Data Archival Centre) project. Answer questions concisely, using a confident, helpful, and professional tone, focusing only on satellite data, oceanography, or meteorology. Address the user directly."


# --- Core Speech Engine Setup (Uses local Windows/OS TTS) ---
engine = pyttsx3.init('sapi5')
voices = engine.getProperty('voices')
# Setting a male voice (often voices[0] on Windows)
engine.setProperty('voice', voices[0].id) 
engine.setProperty('rate', 175) # Adjust speech rate

def speak(audio):
    """Speaks and prints the audio text."""
    print(f"Assistant: {audio}")
    engine.say(audio)
    engine.runAndWait()

def take_commands():
    """Captures voice input from the microphone."""
    r = sr.Recognizer()
    # Ensure recognizer is robust to background noise
    with sr.Microphone() as source:
        print("\n\n" + "="*40)
        print(" | SPEAK NOW: Listening...")
        print("="*40)
        r.pause_threshold = 1 # Seconds of non-speaking data before a phrase is considered complete
        r.adjust_for_ambient_noise(source, duration=1) # Calibrate noise
        audio = r.listen(source)

    print("\n | Listening Stopped.")
    
    try:
        print(" | Processing: Recognizing speech and contacting AI...")
        # Use Google's recognition service
        query = r.recognize_google(audio, language='en-in') 
        print(f" User Said: {query}")
        return query.lower()
        
    except sr.UnknownValueError:
        # User spoke too quietly or non-speech was captured
        speak("Sorry, I didn't catch that. Could you please repeat?")
        return ""
    except sr.RequestError:
        # Error connecting to the speech recognition service (e.g., no internet)
        speak("I am currently unable to access the recognition service. Please check your connection.")
        return ""


def gemini_query(text):
    """Sends query to Gemini API for smart, MOSDAC-specific answers."""
    if not API_KEY:
        return "Gemini API key is not configured. I can only handle hardcoded commands."

    # Enhanced prompt with MOSDAC context
    enhanced_prompt = f"{SYSTEM_PROMPT}\n\nUser query: {text}\n\nPlease provide a concise, helpful response focused on satellite data, oceanography, or meteorology."

    payload = {
        "contents": [{
            "parts": [{"text": enhanced_prompt}]
        }]
    }

    try:
        # Use correct API endpoint
        url = GEMINI_TEXT_API_URL

        response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload), timeout=15)
        response.raise_for_status()

        result = response.json()

        # Extract text from the response
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                generated_text = candidate['content']['parts'][0].get('text', '')
                if generated_text:
                    return generated_text.strip()

        return "I apologize, but I couldn't generate a proper response. Please try rephrasing your question."

    except requests.exceptions.HTTPError as e:
        if response.status_code == 400:
            return "I encountered an issue with the API request. The query might be too complex."
        elif response.status_code == 403:
            return "API access is restricted. Please check the API key configuration."
        else:
            return f"API error: {response.status_code}"
    except requests.exceptions.RequestException as e:
        print(f"Network Error: {e}")
        return "I encountered a network issue while processing your request."
    except Exception as e:
        print(f"General Error during API call: {e}")
        return "An internal error occurred during processing."


def fetch_weather(location):
    """Fetches weather data from OpenWeatherMap API."""
    if not OPENWEATHER_API_KEY:
        return "OpenWeatherMap API key not configured."
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        temp = data['main']['temp']
        description = data['weather'][0]['description']
        return f"The current temperature in {location} is {temp} degrees Celsius with {description}."
    except requests.exceptions.RequestException as e:
        print(f"Weather API Error: {e}")
        return "Unable to fetch weather data. Please check the location or API key."
    except KeyError:
        return "Invalid location or API response."


def fetch_satellite_data(lat, lon):
    """Fetches satellite imagery info from NASA API."""
    if not NASA_API_KEY:
        return "NASA API key not configured."
    url = f"https://api.nasa.gov/planetary/earth/imagery?lon={lon}&lat={lat}&date=2023-01-01&api_key={NASA_API_KEY}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        # NASA returns image URL, but for voice, summarize
        return f"Satellite imagery available for coordinates {lat}, {lon}. Image URL: {data.get('url', 'N/A')}"
    except requests.exceptions.RequestException as e:
        print(f"NASA API Error: {e}")
        return "Unable to fetch satellite data. Please check coordinates or API key."


def extract_keywords(query):
    """Simple keyword extraction for location and data type."""
    # Basic extraction, can be improved with NLP
    if "weather" in query:
        # Extract location, assume after "in" or "for"
        if "in" in query:
            location = query.split("in")[-1].strip()
        elif "for" in query:
            location = query.split("for")[-1].strip()
        else:
            location = "Mumbai"  # Default
        return "weather", location
    elif "satellite" in query or "image" in query:
        # Assume coordinates or default
        # For simplicity, use default coords for India
        lat, lon = 20.5937, 78.9629  # Center of India
        return "satellite", (lat, lon)
    return None, None


def handle_commands(query):
    """
    Processes the transcribed user query.
    This is where you would place your MOSDAC-specific logic.
    """
    
    # 1. Hardcoded Commands (e.g., for immediate system control or simple phrases)
    if "exit" in query or "goodbye" in query or "shut down" in query or "stop" in query:
        speak("Goodbye, sir. Have a good day.")
        sys.exit()

    elif "how are you" in query:
        speak("I am functioning perfectly, ready to assist with satellite data.")

    # 2. MOSDAC Data Fetching Commands
    data_type, param = extract_keywords(query)
    if data_type == "weather":
        speak("Fetching weather data...")
        response = fetch_weather(param)
        speak(response)
    elif data_type == "satellite":
        lat, lon = param
        speak("Fetching satellite data...")
        response = fetch_satellite_data(lat, lon)
        speak(response)
    else:
        # 3. Fallback to Gemini for smart Q&A
        speak("Processing your request with the AI engine...")
        response = gemini_query(query)
        speak(response)

# --- Main Program Loop ---
if __name__ == "__main__":
    
    # Initial Greeting (Ensures greetings happen first)
    now = datetime.datetime.now()
    current_hour = now.hour
    if 0 <= current_hour < 12: greeting = "good morning"
    elif 12 <= current_hour < 18: greeting = "good afternoon"
    else: greeting = "good evening"
    
    speak("Hello, I am your ISRO voice assistant, how can I help you today?")
    
    while True:
        command = take_commands()
        if command:
            handle_commands(command)
