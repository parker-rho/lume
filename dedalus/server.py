from flask import Flask, request, jsonify
from flask_cors import CORS
import asyncio
import os
import requests
from dotenv import load_dotenv
from make_instructions import make_instructions
from select_elements import process_instructions_step_by_step, process_all_steps, get_selected_elements_history
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Create or reuse a global event loop
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)


@app.post("/transcribe")
def transcribe_audio():
    """
    Proxies audio transcription requests to OpenAI Whisper API
    Keeps the API key secure on the server side
    """
    try:
        # Get API key from environment
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({"status": "error", "message": "OpenAI API key not configured"}), 500

        # Get audio file from request
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No audio file provided"}), 400

        audio_file = request.files['file']
        if audio_file.filename == '':
            return jsonify({"status": "error", "message": "No audio file selected"}), 400

        # Ensure we read from the beginning of the file
        audio_file.seek(0)
        
        # Get content type, default to audio/webm if not provided
        content_type = audio_file.content_type or 'audio/webm'
        
        # Prepare form data for OpenAI API
        files = {
            'file': (audio_file.filename, audio_file, content_type)
        }
        data = {
            'model': 'whisper-1',
            'response_format': 'json'
        }
        headers = {
            'Authorization': f'Bearer {api_key}'
        }

        # Forward request to OpenAI Whisper API
        response = requests.post(
            'https://api.openai.com/v1/audio/transcriptions',
            headers=headers,
            files=files,
            data=data
        )

        if response.status_code != 200:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error_message = error_data.get('error', {}).get('message', 'Transcription failed')
            return jsonify({"status": "error", "message": error_message}), response.status_code

        result = response.json()
        return jsonify({"status": "success", "text": result.get('text', '')}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.post("/parse")
def run_instructions():
    """
    Runs the async make_instructions() when the Chrome extension calls /parse,
    using the 'message' string sent in the request body.
    Includes error handling for missing fields and unexpected exceptions.
    """
    try:
        # Parse JSON from request
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

        if "message" not in data:
            return jsonify({"status": "error", "message": "Missing 'message' field in request body"}), 400

        prompt = data["message"]
        context = data["context"]
        print(type(context))

        # Run the async task synchronously
        try:
            result = loop.run_until_complete(make_instructions(prompt, context))
        except Exception as async_err:
            return jsonify({
                "status": "error",
                "message": f"Make instructions function failed: {str(async_err)}"
            }), 500

        # Return result
        return jsonify({"status": "success", "result": result}), 200


    except Exception as e:
        # Catch any other unexpected errors
        return jsonify({"status": "error", "message": f"Unexpected server error: {str(e)}"}), 500


@app.post("/select-element")
def select_element():
    """
    Selects the appropriate element from annotated HTML for a specific step.
    
    Request body should contain:
    {
        "annotated_html": [...],  // Array of elements from DOMAnnotator
        "step_index": 0,           // Which step to process (0-indexed)
        "instructions_file": "dedalus/dedalus.json"  // Optional, defaults to dedalus.json
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body must be JSON"}), 400
        
        if "annotated_html" not in data:
            return jsonify({"status": "error", "message": "Missing 'annotated_html' field"}), 400
        
        annotated_html = data["annotated_html"]
        step_index = data.get("step_index", 0)
        instructions_file = data.get("instructions_file", "dedalus.json")
        
        # Run the async element selection
        result = loop.run_until_complete(
            process_instructions_step_by_step(instructions_file, annotated_html, step_index)
        )
        
        return jsonify({"status": "success", "result": result}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500


@app.post("/select-all-elements")
def select_all_elements():
    """
    Processes ALL steps and returns elements for each one.
    Useful for testing/previewing the full flow.
    
    Request body should contain:
    {
        "annotated_html": [...],  // Array of elements from DOMAnnotator
        "instructions_file": "dedalus/dedalus.json"  // Optional
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "Request body must be JSON"}), 400
        
        if "annotated_html" not in data:
            return jsonify({"status": "error", "message": "Missing 'annotated_html' field"}), 400
        
        annotated_html = data["annotated_html"]
        instructions_file = data.get("instructions_file", "dedalus.json")
        
        # Run the async processing for all steps
        results = loop.run_until_complete(
            process_all_steps(instructions_file, annotated_html)
        )
        
        return jsonify({"status": "success", "results": results}), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500


@app.get("/selected-elements-history")
def get_history():
    """
    Retrieves the history of all selected elements.
    
    Query parameter:
    - instructions_file: Path to JSON file (default: dedalus.json)
    
    Example: GET /selected-elements-history?instructions_file=dedalus.json
    """
    try:
        instructions_file = request.args.get("instructions_file", "dedalus.json")
        history = get_selected_elements_history(instructions_file)
        
        return jsonify({
            "status": "success",
            "count": len(history),
            "history": history
        }), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Unexpected error: {str(e)}"}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
