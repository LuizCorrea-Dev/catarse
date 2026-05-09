
import os
import binascii

file_path = r'c:\Users\User\Documents\Projetos\CATARSE\escopo\catarse\catarse\src\lib\supabase.ts'

print(f"File size: {os.path.getsize(file_path)}")

with open(file_path, 'rb') as f:
    content = f.read()
    print(f"Read content length: {len(content)}")
    print(f"Hex start (50 bytes): {binascii.hexlify(content[:50])}")
    print(f"Hex end (50 bytes): {binascii.hexlify(content[-50:])}")
    
    # Check for null bytes or weird stuff
    if b'\x00' in content:
        print("NULL BYTE DETECTED")
        
    # Count lines by various line endings
    print(f"LF count: {content.count(b'\n')}")
    print(f"CR count: {content.count(b'\r')}")
    print(f"CRLF count: {content.count(b'\r\n')}")

    # Print with line numbers using python
    lines = content.splitlines()
    print(f"Splitlines count: {len(lines)}")
    for i, line in enumerate(lines):
        print(f"{i+1}: {line}")
