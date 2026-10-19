from routing.services.alternatives import find_routes
from routing.services.providers import RouteQuery

from .factories import START, FakeProvider, straight_route

QUERY = RouteQuery(origin=(40.0, -100.0), destination=(40.0, -98.0), departure=START, load_lb=20_000)


def test_duplicate_alternatives_are_dropped_and_detours_fill_the_gap():
    main = straight_route()
    duplicate = straight_route(name="dup")
    north = straight_route(start=(40.5, -100.0), name="north")
    south = straight_route(start=(39.5, -100.0), name="south")
    provider = FakeProvider([main, duplicate], detours=[north, south])
    routes = find_routes(provider, QUERY)
    assert sorted(r.name for r in routes) == ["Test road", "north", "south"]
    assert all(call.via for call in provider.calls[1:])


def test_detours_that_are_much_slower_are_rejected():
    main = straight_route()
    slow = straight_route(start=(41.0, -100.0), speed_mps=5, name="slow")
    routes = find_routes(FakeProvider([main], detours=[slow]), QUERY)
    assert [r.name for r in routes] == ["Test road"]
