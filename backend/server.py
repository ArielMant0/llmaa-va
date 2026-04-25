import config
from dotenv import dotenv_values
from app import llm_bp, ds_bp
from flask import Flask
from flask_cors import CORS


class PrefixMiddleware(object):

    def __init__(self, app, prefix=''):
        self.app = app
        self.prefix = prefix

    def __call__(self, environ, start_response):

        if environ['PATH_INFO'].startswith(self.prefix):
            environ['PATH_INFO'] = environ['PATH_INFO'][len(self.prefix):]
            environ['SCRIPT_NAME'] = self.prefix
            return self.app(environ, start_response)
        else:
            start_response('404', [('Content-Type', 'text/plain')])
            return ["This url does not belong to the app.".encode()]
        

def create_app():
    app = Flask(__name__)
    app.config.update(
        DEBUG=config.DEBUG,
        SECRET_KEY=config.SECRET_KEY
    )
    app.wsgi_app = PrefixMiddleware(app.wsgi_app, prefix=config.ROUTE_PREFIX)

    # Register blueprints here
    app.register_blueprint(llm_bp, url_prefix="/llm")
    app.register_blueprint(ds_bp, url_prefix="/data")

    CORS(app, supports_credentials=True)

    return app


if __name__ == "__main__":
    app = create_app()
    dot = dotenv_values("../.env")
    app.run(port=int(dot.get("BACKEND_PORT", 8000)))
