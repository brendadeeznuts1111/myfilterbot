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
        """
        Initialize the TypeAnnotationAdder.
        
        Sets up:
        - results: list to collect per-file processing summaries.
        - common_types: mapping of simple type keywords to their canonical typing names used by the heuristics (e.g., 'list' -> 'List', 'dict' -> 'Dict').
        """
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
        """
        Recursively process all Python files under the given directory, applying type-annotation fixes.
        
        For each `.py` file found under `directory` this method:
        - skips files for which `should_skip_file` returns True,
        - calls `process_file` to parse and (if needed) update the file,
        - logs an info message at start and logs errors for individual files without halting the overall run.
        
        Parameters:
            directory (str): Path to the directory to traverse (absolute or relative). No return value; file modifications (if any) are performed by `process_file`.
        """
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
        """
        Process a single Python file: parse its AST, add missing typing imports, add function return annotations, and add class attribute annotations.
        
        Reads the file at `filepath`, parses it into an AST (returns early on SyntaxError), runs add_missing_imports, add_function_annotations, and add_class_annotations in that order. If the file content changes, overwrites the file with the updated content and appends an "Updated: <filepath>" entry to self.results.
        
        Parameters:
            filepath (str): Path to the Python file to process.
        
        Side effects:
            - May modify the file on disk by rewriting it with added annotations/imports.
            - Appends an entry to `self.results` when the file is updated.
            - Logs progress, errors, and the update/no-change outcome.
        """
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
        """
        Ensure a standard `typing` import line exists in the module source and insert it if missing.
        
        If the content already contains a `from typing import ...` or `import typing` statement, the original content is returned unchanged. Otherwise this function inserts the line
            from typing import Dict, List, Optional, Any, Tuple, Set, Union
        after the module-level docstring (if present) or before the first non-comment, non-blank line (typically before the first import or code line), and returns the modified source as a single string.
        """
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
        """
        Add missing return type annotations to top-level function and async function definitions.
        
        Scans the provided AST for functions and async functions that do not have an explicit return annotation and injects a best-effort return annotation into the corresponding source line. The inferred return type is obtained from self.infer_return_type(func), and the annotation is only inserted when the function definition line contains a colon and does not already include '->'. Returns a new source string with updated function definition lines; other lines are left unchanged.
        
        Parameters:
            content (str): Original Python source code.
            tree (ast.AST): Parsed AST for the source code.
        
        Returns:
            str: Source code with added return type annotations where applicable.
        """
        lines = content.split('\n')
        
        class FunctionVisitor(ast.NodeVisitor):
            def __init__(self):
                """
                Initialize the instance.
                
                Creates an empty list used to collect function metadata encountered during AST traversal (functions that may need return annotations).
                """
                self.functions = []
                
            def visit_FunctionDef(self, node):
                # Skip if already has return annotation
                """
                Visit a FunctionDef node and record functions that lack an explicit return annotation.
                
                This method is called during AST traversal. For each ast.FunctionDef with no return annotation,
                it appends a dict to self.functions containing:
                - 'name': function name (str)
                - 'lineno': definition line number (int)
                - 'args': list of argument names (List[str])
                - 'has_return': True if the function body contains any ast.Return node, else False
                
                Then continues generic traversal of the node.
                """
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
                """
                Handle async function definitions in the AST.
                
                If the async function has no return annotation, append a dict to self.functions capturing:
                - 'name': function name
                - 'lineno': definition line number
                - 'args': list of argument names
                - 'has_return': True if a Return node exists anywhere in the function body
                - 'is_async': True
                
                Continues normal traversal of child nodes.
                """
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
        """
        Infer a best-effort return type annotation for a function based on its name and metadata.
        
        Given a function metadata mapping, returns a string suitable for use as a return annotation (e.g. "bool", "List[Any]", "Optional[Any]", "None", "Any"). The inference is heuristic and based on common name patterns and flags:
        - boolean predicates (names starting with "is_", "has_", "can_") -> "bool"
        - getters with "list" or "dict" in the name -> "List[Any]" or "Dict[str, Any]"
        - generic "get_*" -> "Optional[Any]"
        - names ending with "_count" or "_id" -> "int"
        - names ending with "_name" or "_message" -> "str"
        - functions without a return or lifecycle-like functions ("__init__", "setup", "cleanup") -> "None"
        - async functions default to "None" unless otherwise specified
        - fallback -> "Any"
        
        Parameters:
            func_info (Dict): Metadata for the function. Expected keys:
                - name (str): Function name.
                - has_return (bool): Whether the function body contains an explicit return.
                - is_async (bool, optional): Whether the function is async (defaults to False).
        
        Returns:
            str: A string representing the inferred return type annotation.
        """
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
        """
        Add inferred type annotations for instance attributes defined in a class's __init__.
        
        Scans the AST for classes that define instance attributes via assignments to self.* inside __init__. For each such class, inserts class-level attribute annotations immediately after the class header (skipping a class docstring if present). Types are determined by infer_attribute_type for each attribute. Returns the updated source content with the inserted annotations; if no applicable classes or attributes are found, returns the original content unchanged.
        """
        lines = content.split('\n')
        
        class ClassVisitor(ast.NodeVisitor):
            def __init__(self):
                """
                Initialize the instance.
                
                Creates an empty list self.classes used to collect class metadata discovered during AST traversal.
                """
                self.classes = []
                
            def visit_ClassDef(self, node):
                # Find __init__ method
                """
                Visit an AST ClassDef node, extract instance attribute assignments from its __init__, and record the class metadata.
                
                Searches the class body for an __init__ method, collects assignments to self.<attr> within that method (name, line number, and assigned value AST node), and appends a dictionary with the class name, its line number, and the list of discovered attributes to self.classes. Uses generic_visit at the end to continue traversal.
                
                Parameters:
                    node (ast.ClassDef): The class definition AST node being visited.
                
                Side effects:
                    Mutates self.classes by appending an entry when one or more instance attributes are found.
                """
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
        """
        Infer a typing expression for a class attribute based on its name.
        
        This uses simple name-based heuristics to choose a best-effort type string suitable for insertion into a class annotation. Expects attr_info to be a dict containing the attribute's name under the 'name' key.
        
        Returns:
            A string representing the inferred type annotation, one of:
            - 'int'
            - 'str'
            - 'bool'
            - 'List[Any]'
            - 'Dict[str, Any]'
            - 'Optional[datetime]'
            - 'Any'
        """
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
    """
    Run the annotation tool across project directories and print a summary.
    
    Instantiates TypeAnnotationAdder, processes the 'src/bot' and 'tests/python' directories (writing updated files in-place when changes are made), and prints progress and a brief summary of annotated files to stdout. No return value.
    """
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
