#!/usr/bin/env python3
"""
Script to fix Python test imports after reorganization
"""

import os
import re
from pathlib import Path

# Mapping of old imports to new imports
IMPORT_MAPPINGS = {
    'from src.': 'from src.bot.',
    'from handlers import': 'from src.bot.handlers.handlers import',
    'from config import': 'from src.bot.config import',
    'from database import': 'from src.bot.database import',
    'from utils import': 'from src.bot.utils.utils import',
    'from error_handler import': 'from src.bot.services.error_handler import',
    'from portal_integration import': 'from src.bot.services.portal_integration import',
    'from chat_tracker import': 'from src.bot.services.chat_tracker import',
    'from session_manager import': 'from src.bot.services.session_manager import',
    'from src.telegram_dashboard': 'from src.bot.telegram_dashboard',
    'import src.': 'import src.bot.',
}

def fix_imports_in_file(filepath):
    """Fix imports in a single Python file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix sys.path additions
    content = re.sub(
        r'sys\.path\.insert\(0, str\(Path\(__file__\)\.parent\)\)',
        'sys.path.insert(0, str(Path(__file__).parent.parent.parent))',
        content
    )
    
    # Apply import mappings
    for old_import, new_import in IMPORT_MAPPINGS.items():
        content = content.replace(old_import, new_import)
    
    # Only write if changes were made
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

def main():
    """Fix all Python test imports"""
    test_dir = Path('tests/python')
    
    if not test_dir.exists():
        print("❌ tests/python directory not found!")
        return
    
    fixed_count = 0
    total_count = 0
    
    for test_file in test_dir.glob('test_*.py'):
        total_count += 1
        if fix_imports_in_file(test_file):
            print(f"✅ Fixed imports in {test_file.name}")
            fixed_count += 1
        else:
            print(f"⏭️  No changes needed in {test_file.name}")
    
    print(f"\n📊 Summary: Fixed {fixed_count}/{total_count} test files")

if __name__ == '__main__':
    main()