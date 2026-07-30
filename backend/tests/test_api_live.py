"""Quick live API smoke test."""
import requests, json

BASE = "http://localhost:8000/api/vetting"

# Test 1: QuickSort (should score high)
qs_diff = """class Sorter:
    def quicksort(self, arr):
        if len(arr) <= 1:
            return arr
        pivot = arr[0]
        return self.quicksort([x for x in arr[1:] if x <= pivot]) + [pivot] + self.quicksort([x for x in arr[1:] if x > pivot])
"""
r1 = requests.post(f"{BASE}/analyze", json={"uid": "user_qs", "project_id": "proj_1", "diff": qs_diff})
print("QuickSort:", json.dumps(r1.json(), indent=2))

# Test 2: Print spam (should score 0)
spam = "\n".join([f'print("line {i}")' for i in range(50)])
r2 = requests.post(f"{BASE}/analyze", json={"uid": "user_spam", "project_id": "proj_1", "diff": spam})
print("\nPrint-Spam:", json.dumps(r2.json(), indent=2))

# Test 3: Team evaluation
r3 = requests.get(f"{BASE}/team/proj_1")
print("\nTeam Eval:", json.dumps(r3.json(), indent=2))
