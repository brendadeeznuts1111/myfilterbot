#!/usr/bin/env python3
"""
Notification Template Renderer
High-performance template rendering with Handlebars-like syntax
"""

import sys
import json
import re
from datetime import datetime
from typing import Dict, Any, Optional
import html

class TemplateRenderer:
    """Enhanced template renderer with variable substitution and conditional logic"""
    
    def __init__(self):
        self.variable_pattern = re.compile(r'\{\{([^}]+)\}\}')
        self.conditional_pattern = re.compile(r'\{\{#if\s+([^}]+)\}\}(.*?)\{\{/if\}\}', re.DOTALL)
        self.unless_pattern = re.compile(r'\{\{#unless\s+([^}]+)\}\}(.*?)\{\{/unless\}\}', re.DOTALL)
        self.each_pattern = re.compile(r'\{\{#each\s+([^}]+)\}\}(.*?)\{\{/each\}\}', re.DOTALL)
        
    def render(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        """Render template with variables and conditions"""
        start_time = datetime.now()
        
        try:
            template = template_data.get('template', {})
            variables = template_data.get('variables', {})
            channel = template_data.get('channel', 'web')
            customization = template_data.get('customization')
            user_context = template_data.get('userContext', {})
            
            # Prepare render context
            render_context = {
                **variables,
                **user_context,
                'now': datetime.now().isoformat(),
                'channel': channel
            }
            
            # Get base title and message
            base_title = customization.get('titleOverride') if customization else None
            base_message = customization.get('messageOverride') if customization else None
            
            if not base_title:
                base_title = template.get('title', 'Notification')
            if not base_message:
                base_message = template.get('message', '')
            
            # Render title
            rendered_title = self.render_template_string(base_title, render_context, channel)
            
            # Render message
            rendered_message = self.render_template_string(base_message, render_context, channel)
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "success": True,
                "title": rendered_title,
                "message": rendered_message,
                "context": render_context,
                "duration": duration,
                "variables_used": self.get_variables_used(base_title + base_message),
                "channel": channel
            }
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            return {
                "success": False,
                "error": str(e),
                "duration": duration
            }
    
    def render_template_string(self, template_str: str, context: Dict[str, Any], channel: str) -> str:
        """Render a template string with context variables"""
        if not template_str:
            return ""
        
        # Process conditionals first
        rendered = self.process_conditionals(template_str, context)
        
        # Process each loops
        rendered = self.process_each_loops(rendered, context)
        
        # Process variable substitutions
        rendered = self.process_variables(rendered, context)
        
        # Apply channel-specific formatting
        rendered = self.apply_channel_formatting(rendered, channel, context)
        
        return rendered.strip()
    
    def process_conditionals(self, template_str: str, context: Dict[str, Any]) -> str:
        """Process {{#if}} and {{#unless}} conditionals"""
        # Process #if statements
        def replace_if(match):
            condition = match.group(1).strip()
            content = match.group(2)
            
            if self.evaluate_condition(condition, context):
                return content
            return ""
        
        rendered = self.conditional_pattern.sub(replace_if, template_str)
        
        # Process #unless statements
        def replace_unless(match):
            condition = match.group(1).strip()
            content = match.group(2)
            
            if not self.evaluate_condition(condition, context):
                return content
            return ""
        
        rendered = self.unless_pattern.sub(replace_unless, rendered)
        
        return rendered
    
    def process_each_loops(self, template_str: str, context: Dict[str, Any]) -> str:
        """Process {{#each}} loops"""
        def replace_each(match):
            array_name = match.group(1).strip()
            content_template = match.group(2)
            
            array_data = context.get(array_name, [])
            if not isinstance(array_data, list):
                return ""
            
            results = []
            for i, item in enumerate(array_data):
                item_context = {
                    **context,
                    'this': item,
                    '@index': i,
                    '@first': i == 0,
                    '@last': i == len(array_data) - 1
                }
                
                # If item is a dict, merge its keys into context
                if isinstance(item, dict):
                    item_context.update(item)
                
                rendered_content = self.render_template_string(content_template, item_context, context.get('channel', 'web'))
                results.append(rendered_content)
            
            return "\n".join(results)
        
        return self.each_pattern.sub(replace_each, template_str)
    
    def process_variables(self, template_str: str, context: Dict[str, Any]) -> str:
        """Process variable substitutions"""
        def replace_variable(match):
            variable_expr = match.group(1).strip()
            
            # Handle helper expressions
            if ' ' in variable_expr:
                parts = variable_expr.split(' ', 1)
                helper = parts[0]
                args = parts[1] if len(parts) > 1 else ''
                
                return self.apply_helper(helper, args, context)
            
            # Simple variable lookup
            return self.get_variable_value(variable_expr, context)
        
        return self.variable_pattern.sub(replace_variable, template_str)
    
    def evaluate_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        """Evaluate conditional expressions"""
        try:
            # Handle simple variable checks
            if condition in context:
                value = context[condition]
                return bool(value) and value != "" and value != 0
            
            # Handle comparison operators
            if ' ' in condition:
                parts = condition.split(' ', 2)
                if len(parts) == 3:
                    left, operator, right = parts
                    left_val = self.get_variable_value(left, context)
                    right_val = self.parse_value(right, context)
                    
                    if operator == '==':
                        return str(left_val) == str(right_val)
                    elif operator == '!=':
                        return str(left_val) != str(right_val)
                    elif operator == '>':
                        return float(left_val) > float(right_val)
                    elif operator == '<':
                        return float(left_val) < float(right_val)
                    elif operator == '>=':
                        return float(left_val) >= float(right_val)
                    elif operator == '<=':
                        return float(left_val) <= float(right_val)
            
            return False
        except:
            return False
    
    def apply_helper(self, helper: str, args: str, context: Dict[str, Any]) -> str:
        """Apply template helpers"""
        try:
            if helper == 'format_currency':
                value = self.get_variable_value(args, context)
                return self.format_currency(value)
            
            elif helper == 'format_date':
                parts = args.split(' ')
                date_var = parts[0]
                format_str = parts[1] if len(parts) > 1 else '%Y-%m-%d %H:%M:%S'
                value = self.get_variable_value(date_var, context)
                return self.format_date(value, format_str.strip('"\''))
            
            elif helper == 'format_percentage':
                value = self.get_variable_value(args, context)
                return self.format_percentage(value)
            
            elif helper == 'upper':
                value = self.get_variable_value(args, context)
                return str(value).upper()
            
            elif helper == 'lower':
                value = self.get_variable_value(args, context)
                return str(value).lower()
            
            elif helper == 'capitalize':
                value = self.get_variable_value(args, context)
                return str(value).capitalize()
            
            elif helper == 'truncate':
                parts = args.split(' ')
                var_name = parts[0]
                length = int(parts[1]) if len(parts) > 1 else 50
                value = str(self.get_variable_value(var_name, context))
                return value[:length] + ('...' if len(value) > length else '')
            
            else:
                # Unknown helper, return original
                return f"{{{{{helper} {args}}}}}"
                
        except Exception as e:
            return f"[Helper Error: {str(e)}]"
    
    def get_variable_value(self, variable_name: str, context: Dict[str, Any]) -> str:
        """Get variable value from context with fallback"""
        try:
            # Handle nested properties with dot notation
            if '.' in variable_name:
                parts = variable_name.split('.')
                value = context
                for part in parts:
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        return f"[{variable_name}]"
                return str(value)
            
            # Simple variable lookup
            if variable_name in context:
                return str(context[variable_name])
            
            # Return placeholder if variable not found
            return f"[{variable_name}]"
            
        except Exception:
            return f"[{variable_name}]"
    
    def parse_value(self, value_str: str, context: Dict[str, Any]) -> Any:
        """Parse string value, checking if it's a variable reference"""
        value_str = value_str.strip()
        
        # Remove quotes if present
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        # Check if it's a number
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            pass
        
        # Check if it's a boolean
        if value_str.lower() == 'true':
            return True
        elif value_str.lower() == 'false':
            return False
        
        # Assume it's a variable reference
        return self.get_variable_value(value_str, context)
    
    def apply_channel_formatting(self, content: str, channel: str, context: Dict[str, Any]) -> str:
        """Apply channel-specific formatting"""
        if channel == 'telegram':
            # Telegram Markdown formatting
            content = content.replace('**', '*')  # Bold
            content = content.replace('__', '_')  # Italic
            
        elif channel == 'email':
            # HTML escape for email
            content = html.escape(content)
            content = content.replace('\n', '<br>')
            
        elif channel == 'web':
            # HTML formatting for web
            content = html.escape(content)
            content = content.replace('\n', '<br>')
            content = content.replace('**', '<strong>').replace('**', '</strong>')
            content = content.replace('*', '<em>').replace('*', '</em>')
        
        return content
    
    def format_currency(self, value: Any, symbol: str = '$') -> str:
        """Format value as currency"""
        try:
            num_value = float(value)
            return f"{symbol}{num_value:,.2f}"
        except:
            return str(value)
    
    def format_date(self, value: Any, format_str: str = '%Y-%m-%d %H:%M:%S') -> str:
        """Format date value"""
        try:
            if isinstance(value, str):
                # Try to parse ISO format
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return dt.strftime(format_str)
            elif isinstance(value, (int, float)):
                # Assume timestamp
                dt = datetime.fromtimestamp(value)
                return dt.strftime(format_str)
            else:
                return str(value)
        except:
            return str(value)
    
    def format_percentage(self, value: Any, decimals: int = 1) -> str:
        """Format value as percentage"""
        try:
            num_value = float(value)
            return f"{num_value:.{decimals}f}%"
        except:
            return str(value)
    
    def get_variables_used(self, template_str: str) -> list:
        """Extract all variables used in template"""
        variables = set()
        
        for match in self.variable_pattern.finditer(template_str):
            variable_expr = match.group(1).strip()
            
            # Handle helper expressions
            if ' ' in variable_expr:
                parts = variable_expr.split(' ')
                for part in parts[1:]:  # Skip helper name
                    if not part.startswith('"') and not part.startswith("'") and part not in ['true', 'false']:
                        variables.add(part)
            else:
                variables.add(variable_expr)
        
        # Extract from conditionals
        for match in self.conditional_pattern.finditer(template_str):
            condition = match.group(1).strip()
            if ' ' in condition:
                parts = condition.split(' ')
                variables.add(parts[0])  # Left side of comparison
            else:
                variables.add(condition)
        
        return list(variables)

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python template_renderer.py '<template_data_json>'"
        }))
        return
    
    try:
        template_data_json = sys.argv[1]
        template_data = json.loads(template_data_json)
        
        renderer = TemplateRenderer()
        result = renderer.render(template_data)
        
        # Output JSON result for stream consumption
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "duration": 0
        }))

if __name__ == "__main__":
    main()