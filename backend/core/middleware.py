import logging
from threading import local

_thread_locals = local()

class UserIdFilter(logging.Filter):
    def filter(self, record):
        record.user_id = getattr(_thread_locals, 'user_id', 'Anonymous')
        return True

class GlobalLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Let the request go through the View/DRF Auth
        response = self.get_response(request)

        # 2. Now that the view has finished, DRF has attached the user to the request
        user_id = 'Anonymous'
        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
        
        # 3. Set the ID for the logger (which usually fires right after the response is returned)
        _thread_locals.user_id = user_id
        
        return response