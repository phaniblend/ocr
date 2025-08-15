# File: backend/utils/code_analyzer.py
import re
import ast

def analyze_react_code(code):
    """
    Analyze React code to extract useful information for AI processing
    """
    analysis = {
        'components': [],
        'has_state': False,
        'has_effects': False,
        'has_props': False,
        'imports': [],
        'styling_approach': 'unknown',
        'dependencies': [],
        'complexity': 'simple'
    }
    
    try:
        # Find component names
        component_pattern = r'(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)'
        components = re.findall(component_pattern, code)
        analysis['components'] = list(set(components))
        
        # Check for hooks
        if 'useState' in code:
            analysis['has_state'] = True
        if 'useEffect' in code:
            analysis['has_effects'] = True
        
        # Check for props
        if 'props' in code or re.search(r'\(\s*\{.*?\}\s*\)', code):
            analysis['has_props'] = True
        
        # Find imports
        import_pattern = r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]'
        imports = re.findall(import_pattern, code)
        analysis['imports'] = imports
        
        # Detect styling approach
        if 'styled-components' in ' '.join(imports):
            analysis['styling_approach'] = 'styled-components'
        elif 'css' in ' '.join(imports) or '.module.css' in code:
            analysis['styling_approach'] = 'css-modules'
        elif 'makeStyles' in code or '@mui' in ' '.join(imports):
            analysis['styling_approach'] = 'material-ui'
        elif 'tailwind' in code.lower() or 'className=' in code:
            if 'tw-' in code or 'text-' in code or 'bg-' in code:
                analysis['styling_approach'] = 'tailwind'
            else:
                analysis['styling_approach'] = 'inline-classes'
        elif 'style={{' in code or 'style={' in code:
            analysis['styling_approach'] = 'inline-styles'
        
        # Extract dependencies
        analysis['dependencies'] = extract_dependencies(imports)
        
        # Determine complexity
        line_count = len(code.split('\n'))
        if line_count < 50:
            analysis['complexity'] = 'simple'
        elif line_count < 150:
            analysis['complexity'] = 'moderate'
        else:
            analysis['complexity'] = 'complex'
        
    except Exception as e:
        analysis['error'] = str(e)
    
    return analysis

def extract_dependencies(imports):
    """
    Extract third-party dependencies from imports
    """
    dependencies = []
    standard_libs = ['react', 'react-dom', 'path', 'fs', 'http', 'https', 'url', 'util']
    
    for imp in imports:
        # Skip relative imports
        if imp.startswith('.'):
            continue
        
        # Get the package name (first part before /)
        package = imp.split('/')[0]
        
        # Skip standard libraries
        if package not in standard_libs and package not in dependencies:
            dependencies.append(package)
    
    return dependencies

def validate_jsx_syntax(code):
    """
    Basic JSX syntax validation
    """
    errors = []
    
    # Check for unclosed tags
    tag_pattern = r'<([A-Z][a-zA-Z0-9]*)[^>]*>'
    opening_tags = re.findall(tag_pattern, code)
    
    for tag in opening_tags:
        if not re.search(f'</{tag}>', code) and not re.search(f'<{tag}[^>]*/>', code):
            errors.append(f"Possibly unclosed tag: {tag}")
    
    # Check for common syntax errors
    if '() =>' in code and 'const' not in code[:code.index('() =>')]:
        errors.append("Arrow function might be missing variable declaration")
    
    # Check for balanced braces
    if code.count('{') != code.count('}'):
        errors.append("Unbalanced curly braces")
    
    # Check for balanced parentheses
    if code.count('(') != code.count(')'):
        errors.append("Unbalanced parentheses")
    
    return errors

def extract_component_tree(code):
    """
    Extract component hierarchy from React code
    """
    tree = {}
    
    try:
        # Find all JSX elements
        jsx_pattern = r'<([A-Z][a-zA-Z0-9]*)[^>]*>.*?</\1>|<([A-Z][a-zA-Z0-9]*)[^>]*/>'
        elements = re.findall(jsx_pattern, code, re.DOTALL)
        
        # Build a simple tree structure
        for element in elements:
            component_name = element[0] or element[1]
            if component_name:
                if component_name not in tree:
                    tree[component_name] = {'count': 0, 'children': []}
                tree[component_name]['count'] += 1
    
    except Exception:
        pass
    
    return tree

def suggest_improvements(analysis):
    """
    Suggest code improvements based on analysis
    """
    suggestions = []
    
    if not analysis.get('has_state') and analysis.get('complexity') == 'complex':
        suggestions.append("Consider breaking down this component into smaller pieces")
    
    if analysis.get('styling_approach') == 'inline-styles':
        suggestions.append("Consider using CSS modules or styled-components for better maintainability")
    
    if len(analysis.get('components', [])) > 5:
        suggestions.append("Consider splitting components into separate files")
    
    if not analysis.get('has_props') and len(analysis.get('components', [])) > 1:
        suggestions.append("Consider using props for component communication")
    
    return suggestions