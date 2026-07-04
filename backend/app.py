import os
from datetime import timedelta
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_pymongo import PyMongo
from config import Config

mongo = PyMongo()
jwt = JWTManager()


def create_app():
    app = Flask(__name__, static_folder='../frontend', static_url_path='')
    app.config.from_object(Config)
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
    app.config['MONGO_URI'] = Config.MONGO_URI

    CORS(app, origins=lambda origin: origin, supports_credentials=True)
    jwt.init_app(app)
    mongo.init_app(app)

    db = mongo.db
    app.config['db'] = db

    # Create indexes (non-blocking)
    from models import User, Product, Lead, Quotation, Attendance, LeaveRequest
    try:
        User.create_indexes(db)
        Product.create_indexes(db)
        Lead.create_indexes(db)
        Quotation.create_indexes(db)
        Attendance.create_indexes(db)
        LeaveRequest.create_indexes(db)
    except Exception as e:
        print('Warning: Could not create indexes:', e)

    # Register blueprints
    from routes.auth import auth_bp
    from routes.employees import employees_bp
    from routes.products import products_bp
    from routes.leads import leads_bp
    from routes.quotations import quotations_bp
    from routes.attendance_routes import attendance_bp
    from routes.leaves import leaves_bp
    from routes.reports import reports_bp
    from routes.setup import setup_bp
    from routes.invoices import invoices_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(employees_bp, url_prefix='/api/employees')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(leads_bp, url_prefix='/api/leads')
    app.register_blueprint(quotations_bp, url_prefix='/api/quotations')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(leaves_bp, url_prefix='/api/leaves')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(setup_bp, url_prefix='/api/setup')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')

    # Health check
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'version': '2.0.0', 'message': 'KidzVenture ERP API'})

    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=Config.DEBUG)
