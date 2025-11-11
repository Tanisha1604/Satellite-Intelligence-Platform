# JARVIS Voice Chatbot for ISRO MOSDAC

A voice-based intelligent chatbot that interacts with satellite and weather data for the ISRO Bhartiya Antriksh competition.

## Features

- Voice recognition and text-to-speech
- Fetches weather data from OpenWeatherMap
- Fetches satellite imagery info from NASA API
- Fallback to AI for general queries
- Simple web interface for visualization

## Setup Instructions

1. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Get API keys:
   - OpenWeatherMap: https://openweathermap.org/api (free)
   - NASA: https://api.nasa.gov/ (free)

3. Edit `main.py` and replace the empty API keys with your keys:
   ```python
   OPENWEATHER_API_KEY = "your_openweather_key"
   NASA_API_KEY = "your_nasa_key"
   ```

4. Run the chatbot:
   ```
   python main.py
   ```

5. For the web interface, open `voice_interface.html` in a browser (note: it's a mock frontend).

## Usage

- Say "weather in [location]" to get weather data
- Say "satellite image" to get satellite info
- Say "exit" or "goodbye" to quit
- Other queries use AI fallback

## Requirements

- Python 3.7+
- Microphone for voice input
- Speakers for voice output
- Internet connection for API calls
