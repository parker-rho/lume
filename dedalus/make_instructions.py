import logging
from dotenv import load_dotenv
from dedalus_labs import AsyncDedalus, DedalusRunner
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,  # INFO, DEBUG, WARNING, ERROR
    format='%(asctime)s - %(levelname)s - %(message)s',  # include timestamp
    datefmt='%Y-%m-%d %H:%M:%S',
    force=True
)

# Load environment variables from a .env file
load_dotenv()

def write_instructions(filename:str, instructions:str):
    """
    Writes the generated instructions to a JSON file.
    """
    try:
        with open(filename, "r") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        # If file doesn't exist or is empty/invalid, create new structure
        logging.warning("File %s not found or invalid, creating new", filename)
        data = {"message": "", "instructions": []}

    data.setdefault("instructions", [])
    data["instructions"].append(instructions)
    with open(filename, "w") as file:
        json.dump(data, file, indent=4)
    logging.info("Wrote instructions to %s", filename)
    return

async def make_instructions(prompt: str, context: list) -> str:
    client = AsyncDedalus()
    runner = DedalusRunner(client)

    str_context = ", ".join(map(lambda x: json.dumps(x, ensure_ascii=False, indent=4), context))

    logging.info("Starting instruction generation process.")

    result = await runner.run(
        input=f"""When I mention the context, I mean the following abbreviated form of a website as a JSON of only 
        the relevant HTML elements:
        {str_context}
        When I mention the prompt, I mean the following user request:
        {prompt}
        Now, follow these instructions strictly and do nothing else extra:
        0. First note that as you craft your response, this is for an elderly person who struggles with the
        internet. Make your instructions extremely clear and easy to follow.
        1. Use the context to identify the current website. Then identify what website the prompt is talking about. 
        If they don't match, notify the user in a single sentence that they are not on a relevant website and 
        TERMINATE ENTIRELY. In all other cases, just continue to step 2 and completely reset the current 
        response draft.
        2. Use the prompt and the context to give an answer formatted in steps that only highlight a single 
        interactable element on the user's screen. These instructions should make no reference to the context 
        elements, and just use plain English to describe the elements. Use the internet to find any additional 
        information you need.
        3. Set these instructions as the final output with no preface, just begin with the steps and nothing else.
        4. Terminate entirely and stop all processing.""",
        model=[
            "openai/gpt-4.1-mini",
            # "claude-sonnet-4-20250514",
            ],
        mcp_servers= [
            # "joerup/exa-mcp",        # Semantic search engine
            "windsor/brave-search-mcp"  # Privacy-focused web search
        ],
        stream=False,
        max_steps=5,
        )
    
    logging.info("Instruction generation process completed.")

    # Optionally writes full instructions to file for record-keeping
    write_instructions("dedalus.json", result.final_output)

    return result.final_output