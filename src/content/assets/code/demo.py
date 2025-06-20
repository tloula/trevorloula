def add(first: int, second: int) -> int:
    return (first + second)

def subtract(first: int, second: int) -> int:
    return (first - second)

def divide(first: int, second: int) -> float:
    if second == 0:
        return float('inf')
    return (first / second)
