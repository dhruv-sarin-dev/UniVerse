"""
Test suite for the Deterministic AST Proof-of-Work Engine.

Tests:
  - test_minimal_logic: QuickSort vs print-spam discrimination (≥5× gap)
  - test_anti_bloat_penalty: density < 0.01 triggers 0.5× multiplier
  - test_empty_diff: graceful handling of empty input
  - test_diff_format: unified diff parsing (only added lines scored)
  - test_singleton: ASTEngine is a proper singleton
"""

import sys
import os

# Ensure the backend package root is on sys.path so bare imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ast_engine import ASTEngine, W_FUNCTION, W_CLASS, W_CONDITIONAL


# ── Fixtures ────────────────────────────────────────────────────────────────

QUICKSORT_CODE = """\
class Sorter:
    def quicksort(self, arr):
        if len(arr) <= 1:
            return arr
        pivot = arr[0]
        left = [x for x in arr[1:] if x <= pivot]
        right = [x for x in arr[1:] if x > pivot]
        return self.quicksort(left) + [pivot] + self.quicksort(right)

    def merge_sort(self, arr):
        if len(arr) <= 1:
            return arr
        mid = len(arr) // 2
        left = self.merge_sort(arr[:mid])
        right = self.merge_sort(arr[mid:])
        return self._merge(left, right)

    def _merge(self, left, right):
        result = []
        i = j = 0
        if len(left) == 0:
            return right
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        return result + left[i:] + right[j:]
"""

PRINT_SPAM = "\n".join([f'print("line {i}")' for i in range(60)])

BLOAT_CODE = (
    "# " + "x" * 2000 + "\n"  # massive comment
    "def tiny(): pass\n"
)

UNIFIED_DIFF = """\
--- a/foo.py
+++ b/foo.py
@@ -0,0 +1,5 @@
+def added_func():
+    if True:
+        pass
-def removed_func():
-    pass
"""


# ── Tests ───────────────────────────────────────────────────────────────────

def test_minimal_logic():
    """QuickSort must score ≥5× higher than print-spam."""
    engine = ASTEngine.instance()
    qs = engine.analyze_commit(QUICKSORT_CODE)
    ps = engine.analyze_commit(PRINT_SPAM)

    print(f"  QuickSort score : {qs.score}  (F={qs.functions}, C={qs.classes}, L={qs.conditionals})")
    print(f"  PrintSpam score : {ps.score}  (F={ps.functions}, C={ps.classes}, L={ps.conditionals})")

    assert qs.score > 0, "QuickSort should have a positive score"
    # Print-spam has no functions, classes, or conditionals
    assert ps.score == 0, f"Print-spam should score 0, got {ps.score}"
    # Hard gate: ≥5× gap
    assert qs.score >= 5 * max(ps.score, 1), (
        f"Expected qs_score ({qs.score}) ≥ 5 × ps_score ({ps.score})"
    )


def test_anti_bloat_penalty():
    """Low-density code (giant comments + tiny function) should be penalized."""
    engine = ASTEngine.instance()
    result = engine.analyze_commit(BLOAT_CODE)

    print(f"  Bloat score: {result.score}, raw: {result.raw_score}, "
          f"density: {result.density}, penalized: {result.penalized}")

    assert result.penalized, "Bloat code should trigger anti-bloat penalty"
    assert result.score == int(result.raw_score * 0.5), (
        "Penalized score should be 50% of raw"
    )


def test_empty_diff():
    """Empty input should return score 0 without crashing."""
    engine = ASTEngine.instance()
    result = engine.analyze_commit("")
    assert result.score == 0
    assert result.functions == 0
    assert result.classes == 0
    assert result.conditionals == 0

    result2 = engine.analyze_commit("   \n\n  ")
    assert result2.score == 0


def test_diff_format():
    """Unified diff should parse only added lines (the + lines)."""
    engine = ASTEngine.instance()
    result = engine.analyze_commit(UNIFIED_DIFF)

    print(f"  Diff score: {result.score}, F={result.functions}, L={result.conditionals}")

    # Should detect the added function and if-statement, not the removed ones
    assert result.functions >= 1, "Should detect added function_definition"
    assert result.conditionals >= 1, "Should detect added if_statement"


def test_singleton():
    """ASTEngine must be a singleton."""
    a = ASTEngine.instance()
    b = ASTEngine.instance()
    c = ASTEngine()
    assert a is b, "instance() should return same object"
    assert a is c, "direct construction should return same singleton"


def test_scoring_formula():
    """Verify the exact formula: (F × 10) + (C × 20) + (L × 5)."""
    engine = ASTEngine.instance()
    code = """\
class Foo:
    def bar(self):
        if True:
            pass
"""
    result = engine.analyze_commit(code)
    expected = (result.functions * W_FUNCTION) + \
               (result.classes * W_CLASS) + \
               (result.conditionals * W_CONDITIONAL)

    if result.penalized:
        expected = int(expected * 0.5)

    assert result.score == expected, (
        f"Score {result.score} != expected {expected}"
    )


# ── Runner ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        test_minimal_logic,
        test_anti_bloat_penalty,
        test_empty_diff,
        test_diff_format,
        test_singleton,
        test_scoring_formula,
    ]
    passed = 0
    failed = 0
    for t in tests:
        name = t.__name__
        try:
            print(f"\n▶ {name}")
            t()
            print(f"  ✅ PASSED")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed:
        sys.exit(1)
    print("All tests passed. ✅")
