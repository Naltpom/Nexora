"""Parse standard 5-field cron expressions into ARQ ``cron()`` kwargs.

Format: ``minute hour day month weekday``

Examples::

    "0 3 * * *"     -> {"minute": {0}, "hour": {3}}
    "*/15 * * * *"  -> {"minute": {0, 15, 30, 45}}
    "0 4 1 * *"     -> {"minute": {0}, "hour": {4}, "day": {1}}
    "0 5 * * 0"     -> {"minute": {0}, "hour": {5}, "weekday": {0}}
"""


def _parse_field(field: str, min_val: int, max_val: int) -> set[int] | None:
    """Parse a single cron field into a set of integers, or *None* for wildcard."""
    if field == "*":
        return None

    values: set[int] = set()

    for part in field.split(","):
        if "/" in part:
            range_part, step_str = part.split("/", 1)
            step = int(step_str)
            if range_part == "*":
                start, end = min_val, max_val
            elif "-" in range_part:
                start, end = (int(x) for x in range_part.split("-", 1))
            else:
                start, end = int(range_part), max_val
            values.update(range(start, end + 1, step))
        elif "-" in part:
            start, end = (int(x) for x in part.split("-", 1))
            values.update(range(start, end + 1))
        else:
            values.add(int(part))

    return values if values else None


def cron_to_arq_kwargs(expression: str) -> dict:
    """Convert a standard 5-field cron expression to ARQ ``cron()`` kwargs."""
    fields = expression.strip().split()
    if len(fields) != 5:
        raise ValueError(f"Expected 5 cron fields, got {len(fields)}: {expression!r}")

    minute_f, hour_f, day_f, month_f, weekday_f = fields
    kwargs: dict = {}

    minute = _parse_field(minute_f, 0, 59)
    if minute is not None:
        kwargs["minute"] = minute

    hour = _parse_field(hour_f, 0, 23)
    if hour is not None:
        kwargs["hour"] = hour

    day = _parse_field(day_f, 1, 31)
    if day is not None:
        kwargs["day"] = day

    month = _parse_field(month_f, 1, 12)
    if month is not None:
        kwargs["month"] = month

    weekday = _parse_field(weekday_f, 0, 6)
    if weekday is not None:
        kwargs["weekday"] = weekday

    return kwargs
