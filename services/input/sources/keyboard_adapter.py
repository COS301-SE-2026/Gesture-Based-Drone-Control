# /services/input/sources/keyboard_adapter.py

from .input_adapter import InputAdapter


#STUB
class KeyboardAdapter(InputAdapter):
    """Adapter for keyboard input."""
    
    def start(self) -> None:
        pass
    
    def stop(self) -> None:
        pass
    
    def get_next_command(self):
        return None
    
    def handle_message(self, message: str) -> None:
        """Handle a keyboard message."""
        pass