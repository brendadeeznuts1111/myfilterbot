#!/usr/bin/env python3
"""
Type Annotation Enhancement Script
Adds comprehensive type hints to Python files
"""

import ast
import os
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TypeAnnotationAdder:
    """Adds type annotations to Python files"""
    
    def __init__(self):
        self.results = []
        self.common_types = {
            'str': 'str',
            'int': 'int', 
            'float': 'float',
            'bool': 'bool',
            'list': 'List',
            'dict': 'Dict',
            'set': 'Set',
            'tuple': 'Tuple',
            'optional': 'Optional',
            'any': 'Any'
        }
        
    def process_directory(self, directory: str) -> None:
        """Process all Python files in directory"""
        logger.info(f"Processing directory: {directory}")
        
        for py_file in Path(directory).rglob("*.py"):
            if self.should_skip_file(str(py_file)):
                continue
                
            try:
                self.process_file(str(py_file))
            except Exception as e:
                logger.error(f"Error processing {py_file}: {e}")
                
    def should_skip_file(self, filepath: str) -> bool:
        """Check if file should be skipped"""
        skip_patterns = [
            '__pycache__',
            '.git',
            'venv',
            'env',
            'node_modules',
            'test_',
            '_test.py',
            'migrations',
            'backup'
        ]
        
        return any(pattern in filepath for pattern in skip_patterns)
        
    def process_file(self, filepath: str) -> None:
        """Process a single Python file"""
        logger.info(f"Processing: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        
        # Parse AST to understand the code structure
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            logger.error(f"Syntax error in {filepath}: {e}")
            return
            
        # Add missing imports
        content = self.add_missing_imports(content, tree)
        
        # Add type annotations to functions
        content = self.add_function_annotations(content, tree)
        
        # Add type annotations to class attributes
        content = self.add_class_annotations(content, tree)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"✅ Updated {filepath}")
            self.results.append(f"Updated: {filepath}")
        else:
            logger.info(f"⏭️  No changes needed: {filepath}")
            
    def add_missing_imports(self, content: str, tree: ast.AST) -> str:
        """Add missing typing imports"""
        lines = content.split('\n')
        
        # Check if typing imports exist
        has_typing_import = any('from typing import' in line or 'import typing' in line 
                              for line in lines)
        
        if has_typing_import:
            return content
            
        # Find where to insert imports (after docstring and before other imports)
        insert_line = 0
        in_docstring = False
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Skip module docstring
            if i == 0 and (stripped.startswith('"""') or stripped.startswith("'''")):
                in_docstring = True
                continue
            elif in_docstring and (stripped.endswith('"""') or stripped.endswith("'''")):
                in_docstring = False
                insert_line = i + 1
                continue
            elif in_docstring:
                continue
                
            # Found first import or code
            if stripped and not stripped.startswith('#'):
                insert_line = i
                break
                
        # Add typing import
        typing_import = "from typing import Dict, List, Optional, Any, Tuple, Set, Union"
        lines.insert(insert_line, typing_import)
        
        return '\n'.join(lines)
        
    def add_function_annotations(self, content: str, tree: ast.AST) -> str:
        """Add type annotations to functions"""
        lines = content.split('\n')
        
        class FunctionVisitor(ast.NodeVisitor):
            def __init__(self):
                self.functions = []
                
            def visit_FunctionDef(self, node):
                # Skip if already has return annotation
                if node.returns is None:
                    self.functions.append({
                        'name': node.name,
                        'lineno': node.lineno,
                        'args': [arg.arg for arg in node.args.args],
                        'has_return': any(isinstance(n, ast.Return) for n in ast.walk(node))
                    })
                self.generic_visit(node)
                
            def visit_AsyncFunctionDef(self, node):
                # Skip if already has return annotation
                if node.returns is None:
                    self.functions.append({
                        'name': node.name,
                        'lineno': node.lineno,
                        'args': [arg.arg for arg in node.args.args],
                        'has_return': any(isinstance(n, ast.Return) for n in ast.walk(node)),
                        'is_async': True
                    })
                self.generic_visit(node)
        
        visitor = FunctionVisitor()
        visitor.visit(tree)
        
        # Add return type annotations
        for func in visitor.functions:
            line_idx = func['lineno'] - 1
            line = lines[line_idx]
            
            # Skip if line already has return annotation
            if '->' in line:
                continue
                
            # Determine return type
            return_type = self.infer_return_type(func)
            
            # Add return annotation
            if ':' in line:
                colon_idx = line.rfind(':')
                new_line = line[:colon_idx] + f" -> {return_type}" + line[colon_idx:]
                lines[line_idx] = new_line
                
        return '\n'.join(lines)
        
    def infer_return_type(self, func_info: Dict) -> str:
        """Infer return type based on function characteristics"""
        name = func_info['name']
        is_async = func_info.get('is_async', False)
        has_return = func_info['has_return']
        
        # Common patterns
        if name.startswith('is_') or name.startswith('has_') or name.startswith('can_'):
            return 'bool'
        elif name.startswith('get_') and 'list' in name.lower():
            return 'List[Any]'
        elif name.startswith('get_') and 'dict' in name.lower():
            return 'Dict[str, Any]'
        elif name.startswith('get_'):
            return 'Optional[Any]'
        elif name.endswith('_count') or name.endswith('_id'):
            return 'int'
        elif name.endswith('_name') or name.endswith('_message'):
            return 'str'
        elif not has_return or name in ['__init__', 'setup', 'cleanup']:
            return 'None'
        elif is_async:
            return 'None'  # Most async functions return None unless specified
        else:
            return 'Any'
            
    def add_class_annotations(self, content: str, tree: ast.AST) -> str:
        """Add type annotations to class attributes"""
        lines = content.split('\n')
        
        class ClassVisitor(ast.NodeVisitor):
            def __init__(self):
                self.classes = []
                
            def visit_ClassDef(self, node):
                # Find __init__ method
                init_method = None
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and item.name == '__init__':
                        init_method = item
                        break
                        
                if init_method:
                    # Find attribute assignments
                    attributes = []
                    for stmt in init_method.body:
                        if isinstance(stmt, ast.Assign):
                            for target in stmt.targets:
                                if isinstance(target, ast.Attribute) and \
                                   isinstance(target.value, ast.Name) and \
                                   target.value.id == 'self':
                                    attributes.append({
                                        'name': target.attr,
                                        'lineno': stmt.lineno,
                                        'value': stmt.value
                                    })
                    
                    if attributes:
                        self.classes.append({
                            'name': node.name,
                            'lineno': node.lineno,
                            'attributes': attributes
                        })
                        
                self.generic_visit(node)
        
        visitor = ClassVisitor()
        visitor.visit(tree)
        
        # Add class attribute annotations
        for cls in visitor.classes:
            # Find class definition line
            class_line_idx = cls['lineno'] - 1
            
            # Look for existing annotations or add them after class definition
            insert_idx = class_line_idx + 1
            
            # Skip docstring if present
            if insert_idx < len(lines):
                next_line = lines[insert_idx].strip()
                if next_line.startswith('"""') or next_line.startswith("'''"):
                    # Find end of docstring
                    quote_type = '"""' if next_line.startswith('"""') else "'''"
                    if next_line.count(quote_type) == 1:  # Multi-line docstring
                        for i in range(insert_idx + 1, len(lines)):
                            if quote_type in lines[i]:
                                insert_idx = i + 1
                                break
                    else:  # Single-line docstring
                        insert_idx += 1
                        
            # Add attribute annotations
            annotations = []
            for attr in cls['attributes']:
                attr_type = self.infer_attribute_type(attr)
                annotations.append(f"    {attr['name']}: {attr_type}")
                
            if annotations:
                # Insert annotations
                for i, annotation in enumerate(annotations):
                    lines.insert(insert_idx + i, annotation)
                    
        return '\n'.join(lines)
        
    def infer_attribute_type(self, attr_info: Dict) -> str:
        """Infer attribute type from assignment"""
        name = attr_info['name']
        
        # Common patterns
        if name.endswith('_id') or name.endswith('_count'):
            return 'int'
        elif name.endswith('_name') or name.endswith('_message') or name.endswith('_path'):
            return 'str'
        elif name.endswith('_enabled') or name.startswith('is_') or name.startswith('has_'):
            return 'bool'
        elif name.endswith('_list') or name.endswith('_items'):
            return 'List[Any]'
        elif name.endswith('_dict') or name.endswith('_data') or name.endswith('_config'):
            return 'Dict[str, Any]'
        elif name.endswith('_time') or name.endswith('_date'):
            return 'Optional[datetime]'
        else:
            return 'Any'

def main():
    """Main function"""
    print("🔧 Adding type annotations to Python files...")
    
    annotator = TypeAnnotationAdder()
    
    # Process bot directory
    annotator.process_directory('src/bot')
    
    # Process test directory
    annotator.process_directory('tests/python')
    
    print(f"\n📊 Summary:")
    print(f"✅ Processed files with type annotations")
    for result in annotator.results:
        print(f"  {result}")
        
    print("\n✅ Type annotation enhancement complete!")

if __name__ == '__main__':
    main()
