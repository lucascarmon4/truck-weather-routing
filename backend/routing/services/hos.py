HOUR = 3600
DRIVING_LIMIT_S = 11 * HOUR
BREAK_AFTER_S = 8 * HOUR
BREAK_S = 30 * 60
OFF_DUTY_S = 10 * HOUR


def elapsed_time(drive_s, enabled=True):
    """Clock time needed to accumulate `drive_s` of driving under a simplified FMCSA hours-of-service
    schedule: a 30-minute break after 8 h of driving and a 10-hour reset after 11 h."""
    if not enabled:
        return drive_s
    remaining, elapsed = drive_s, 0.0
    while remaining > DRIVING_LIMIT_S:
        elapsed += DRIVING_LIMIT_S + BREAK_S + OFF_DUTY_S
        remaining -= DRIVING_LIMIT_S
    return elapsed + remaining + (BREAK_S if remaining > BREAK_AFTER_S else 0)



def _stop(kind, drive_s, start_s, duration_s):
    return {"kind": kind, "drive_s": drive_s, "start_s": start_s, "duration_s": duration_s}


def rest_stops(drive_s):
    stops, done_drive, done_elapsed, remaining = [], 0.0, 0.0, drive_s
    while remaining > BREAK_AFTER_S:
        stops.append(_stop("break", done_drive + BREAK_AFTER_S, done_elapsed + BREAK_AFTER_S, BREAK_S))
        if remaining <= DRIVING_LIMIT_S:
            break
        stops.append(_stop("rest", done_drive + DRIVING_LIMIT_S, done_elapsed + DRIVING_LIMIT_S + BREAK_S, OFF_DUTY_S))
        done_drive += DRIVING_LIMIT_S
        done_elapsed += DRIVING_LIMIT_S + BREAK_S + OFF_DUTY_S
        remaining -= DRIVING_LIMIT_S
    return stops
