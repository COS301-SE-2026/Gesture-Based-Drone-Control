# apps/backend/app/dependencies.py

"""
Dependency functions.

Import the needed function, use with Depends() in
any route that needs a specific state.

These are all essentially helper functions to assert
a certain precondition for an endpoint to work.

Works hand in hand with a global state that gets updated
to store info that may be relevant to endpoints at different times
"""