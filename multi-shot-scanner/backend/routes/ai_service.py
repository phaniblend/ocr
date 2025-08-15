# File: backend/routes/ai_service.py
import anthropic
import base64
import json
import re
import os

# Initialize Anthropic client lazily
client = None

def get_anthropic_client():
    """Get or create Anthropic client"""
    global client
    if client is None:
        from config.settings import Config
        api_key = Config.ANTHROPIC_API_KEY
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables")
        client = anthropic.Anthropic(api_key=api_key)
    return client

def analyze_ui_with_ai(image_data, react_code, code_analysis, options=None):
    """
    Send image and React code to Claude for UI analysis
    """
    try:
        # Get client
        ai_client = get_anthropic_client()
        
        # Default options
        options = options or {}
        analysis_type = options.get('analysisType', 'ui_fix')
        include_explanation = options.get('includeExplanation', True)
        
        # Prepare the image for Claude
        if image_data.startswith('data:image'):
            # Remove data URL prefix
            image_data = image_data.split(',')[1]
        
        # Decode base64 to get image bytes
        image_bytes = base64.b64decode(image_data)
        
        # Construct the prompt based on analysis type
        prompts = {
            'ui_fix': f"""I have a React component and a screenshot of its current UI. Please analyze the visual issues and provide the fixed code.

Current React Code:
```jsx
{react_code}
```

Code Analysis Summary:
- Components found: {', '.join(code_analysis.get('components', []))}
- Has useState: {code_analysis.get('has_state', False)}
- Has useEffect: {code_analysis.get('has_effects', False)}
- CSS approach: {code_analysis.get('styling_approach', 'unknown')}

Please:
1. Identify all visual issues in the screenshot
2. Provide the complete fixed React code
3. Explain what changes were made and why
4. Include any necessary CSS fixes

Focus on fixing layout issues, spacing problems, alignment, colors, and any UI inconsistencies.""",
            
            'code_review': f"""Review this React component and its rendered UI for best practices and potential improvements.

React Code:
```jsx
{react_code}
```

Please provide:
1. Code quality assessment
2. Performance suggestions
3. Accessibility improvements
4. Best practice recommendations""",
            
            'figma_to_code': """Convert this Figma design to a React component. 
Please provide complete, production-ready React code with proper styling."""
        }
        
        prompt = prompts.get(analysis_type, prompts['ui_fix'])
        
        # Make API call to Claude
        message = ai_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_data
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        )
        
        # Extract the response
        response_text = message.content[0].text if message.content else "No response generated"
        
        # Parse out code blocks if present
        fixed_code = extract_code_from_response(response_text)
        
        return {
            'fixedCode': fixed_code,
            'fullResponse': response_text,
            'analysis': code_analysis,
            'analysisType': analysis_type
        }
        
    except anthropic.APIError as e:
        raise Exception(f"Anthropic API error: {str(e)}")
    except Exception as e:
        raise Exception(f"AI analysis failed: {str(e)}")

def extract_code_from_response(response_text):
    """Extract code blocks from AI response"""
    # Look for code blocks with ```jsx or ```javascript or ```react
    patterns = [
        r'```jsx\n(.*?)```',
        r'```javascript\n(.*?)```',
        r'```react\n(.*?)```',
        r'```\n(.*?)```'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, response_text, re.DOTALL)
        if matches:
            # Return the first complete code block found
            return matches[0].strip()
    
    # If no code blocks found, return the original response
    return response_text

def analyze_design_system(image_data):
    """Extract design tokens from UI screenshot"""
    try:
        # Get client
        ai_client = get_anthropic_client()
        
        # This could be enhanced with computer vision libraries
        # For now, we'll use Claude's vision capabilities
        
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        message = ai_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_data
                            }
                        },
                        {
                            "type": "text",
                            "text": """Analyze this UI and extract:
1. Color palette (hex codes)
2. Typography (font families, sizes)
3. Spacing values
4. Border radius values
5. Shadow styles

Return as JSON format."""
                        }
                    ]
                }
            ]
        )
        
        response_text = message.content[0].text if message.content else "{}"
        
        # Try to parse JSON from response
        try:
            # Find JSON in response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
            
        return {
            'colors': [],
            'typography': {},
            'spacing': [],
            'borderRadius': [],
            'shadows': []
        }
        
    except Exception as e:
        return {'error': str(e)}