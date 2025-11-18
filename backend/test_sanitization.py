import re
import sys
sys.path.insert(0, '.')

from utils.validators import InputValidator

# Test cases
test_cases = [
    {
        "name": "Normal message",
        "text": "OpenRouter is an API platform that provides access to a variety of AI models, including both free and paid options.",
        "should_pass": True
    },
    {
        "name": "Message with hyphens",
        "text": "Here are some models -- free options include --  text-davinci and --  other models",
        "should_pass": True
    },
    {
        "name": "Actual SQL injection",
        "text": "SELECT * FROM users; DROP TABLE users;",
        "should_pass": False
    },
    {
        "name": "SQL DELETE injection",
        "text": "UPDATE users SET admin=1; DELETE FROM logs;",
        "should_pass": False
    },
    {
        "name": "UNION injection",
        "text": "username' UNION SELECT password FROM users--",
        "should_pass": False
    },
    {
        "name": "OR 1=1 injection",
        "text": "username' OR 1=1--",
        "should_pass": False
    },
    {
        "name": "Script tag XSS",
        "text": "<script>alert('XSS')</script>",
        "should_pass": False
    },
    {
        "name": "Event handler XSS",
        "text": "<img src=x onerror=alert('XSS')>",
        "should_pass": False
    },
    {
        "name": "Code discussion with SQL keywords",
        "text": "In SQL, you can use SELECT, INSERT, UPDATE, DELETE statements. How do I DROP an old table?",
        "should_pass": True
    },
    {
        "name": "Long text with code",
        "text": "def query():\n    # This is a comment\n    result = db.query('SELECT * FROM users')\n    return result",
        "should_pass": True
    }
]

print("\n" + "="*80)
print("SANITIZATION TEST SUITE")
print("="*80 + "\n")

passed = 0
failed = 0

for test in test_cases:
    try:
        result = InputValidator.sanitize_string(test["text"], max_length=500000)
        if test["should_pass"]:
            print(f"✅ PASS: {test['name']}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']} (should have been blocked)")
            print(f"   Text: {test['text'][:80]}...")
            failed += 1
    except Exception as e:
        if not test["should_pass"]:
            print(f"✅ PASS: {test['name']} (correctly blocked)")
            print(f"   Reason: {str(e)}")
            passed += 1
        else:
            print(f"❌ FAIL: {test['name']}")
            print(f"   Text: {test['text'][:80]}...")
            print(f"   Error: {str(e)}")
            failed += 1

print("\n" + "="*80)
print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")
print("="*80 + "\n")

if failed > 0:
    sys.exit(1)

