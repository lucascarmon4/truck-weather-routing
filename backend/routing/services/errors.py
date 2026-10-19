class PlanningError(Exception):
    status_code = 400

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class UpstreamError(PlanningError):
    status_code = 502


class NoRouteError(PlanningError):
    status_code = 422


class LocationNotFoundError(PlanningError):
    status_code = 422
