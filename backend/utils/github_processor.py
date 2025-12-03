# backend/utils/github_processor.py - FIXED

import re
from typing import Dict, List, Any
from utils.validators import InputValidator

class GitHubContentProcessor:
    """Process GitHub file content for safe AI consumption"""
    
    @staticmethod
    def detect_language(filename: str) -> str:
        """Detect programming language from filename"""
        ext_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.sql': 'sql',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.txt': 'text',
        }
        
        ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        return ext_map.get(ext, 'text')
    
    @staticmethod
    def preprocess_files_for_context(files_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Preprocess GitHub files to make them safe for AI context.
        Returns sanitized content and metadata.
        """
        processed_files = []
        total_size = 0
        warnings = []
        
        for file_data in files_data:
            try:
                file_name = file_data.get('name', 'unknown')
                file_path = file_data.get('path', '')
                repo = file_data.get('repo', '')
                content = file_data.get('content', '')
                
                # Detect language from filename
                language = GitHubContentProcessor.detect_language(file_name)
                
                # Extract file extension
                file_ext = '.' + file_name.split('.')[-1] if '.' in file_name else ''
                
                # ✅ Prepare validation context - MARK AS CODE
                context = {
                    'is_code_context': True,  # ✅ CRITICAL: Mark as code
                    'file_name': file_name,
                    'file_path': file_path,
                    'file_extension': file_ext,
                    'source': 'github',
                    'repo': repo,
                    'language': language
                }
                
                print(f"📄 Processing GitHub file: {file_name}")
                print(f"   Language: {language}")
                print(f"   Size: {len(content)} chars")
                
                # ✅ Sanitize content with code context
                try:
                    sanitized_content = InputValidator.sanitize_string(
                        content,
                        max_length=100000,  # 100KB per file
                        context=context
                    )
                    
                    original_size = len(content)
                    sanitized_size = len(sanitized_content)
                    
                    processed_files.append({
                        'name': file_name,
                        'path': file_path,
                        'repo': repo,
                        'language': language,
                        'content': sanitized_content,
                        'original_size': original_size,
                        'sanitized_size': sanitized_size
                    })
                    
                    total_size += sanitized_size
                    print(f"✅ Processed {file_name}: {original_size} chars")
                    
                except HTTPException as e:
                    warning = f"Failed to sanitize {file_name}: {e.detail}"
                    warnings.append(warning)
                    print(f"⚠️ {warning}")
                    continue
                    
            except Exception as e:
                warning = f"Failed to process {file_data.get('name', 'unknown')}: {str(e)}"
                warnings.append(warning)
                print(f"⚠️ {warning}")
                continue
        
        return {
            'files': processed_files,
            'total_files': len(processed_files),
            'total_size': total_size,
            'successfully_processed': len(processed_files),
            'warnings': warnings
        }