# utils/templates.py

# Cấu hình chung mặc định (Có thể override từ API Settings)
AI_SERVER_URL = "172.17.0.1:8088"
KAFKA_HOST = "kafka:9092"
SEARCH_SERVER_URL = "http://172.17.0.1:8686/v1"

def get_ai_template(cam_id, topic_in, topic_out):
    """
    Trả về khuôn mẫu Docker cho các module AI.
    Cập nhật theo chuẩn Ftel mới nhất.
    """
    suffix = f"_{cam_id}"
    
    # Base Environment cho các module AI (trừ RTSP và Viewer)
    base_ai_env = {
        "KAFKA_BOOTSTRAP": KAFKA_HOST,
        "URL": AI_SERVER_URL,
        "USE_GRPC": "True",
        "VERBOSE": "True",
        "QUEUE_SIZE": "500"
    }

    templates = {
        # 1. RTSP READER
        "rtsp_reader": {
            "image": "tanmai0502/rtspreader:latest",
            "container_name": f"rtsp_reader{suffix}",
            "restart": "unless-stopped",
            "environment": {
                "BOOTSTRAP_SERVERS": KAFKA_HOST, # Lưu ý: RTSP dùng key này
                "TOPIC": topic_out, 
                "RTSP_URL": "",      # Điền động
                "LOOP_FILE": "False",
                "ROTATION_DEGREE": "0"
            },
            "volumes": [
                "./videos:/app/videos" # Mount folder video nếu cần loop file
            ],
            "networks": ["stream-kafka"]
        },

        # 2. DETECTION
        "pythera_detection": {
            "image": "tanmai0502/pythera-detection-compare:latest",
            "container_name": f"pythera_detection{suffix}",
            "restart": "unless-stopped",
            "environment": {
                **base_ai_env,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "CONSUMER_GROUP": f"pythera_group{suffix}",
                "MODEL_NAME": "detection_ensemble",
                "VERSION": 1,
                "THRESHOLD": 0.4,
                "BATCH_SIZE": 4,
                "CLASSES_NAME": '{"0":"head","1":"body","2":"face"}'
            },
            "networks": ["stream-kafka"]
        },

        # 3. TRACKING
        "tracking_service": {
            "image": "tanmai0502/tracking:latest",
            "container_name": f"tracking_service{suffix}",
            "restart": "unless-stopped",
            "environment": {
                **base_ai_env,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "CONSUMER_GROUP": f"tracking_group{suffix}",
                "FRAME_RATE": 27,
                "KALMAN": "bytetrack",
                
                "TRACK_THRESH":0.5,
                "NEW_TRACK_THRESH":0.3,
                "TRACK_BUFFER":60,
                "MATCH_THRESH":0.8,
                "PROXIMITY_THRESH":0.5,
                "APPEARANCE_THRESH":0.25,
                "FUSE_FIRST_ASSOCIATE":"False",
                "REID_THRESH":0.8,

                "MODEL_NAME":"reid_ensemble",
                "VERSION":"1",
                "USE_GRPC":"True",
                "USE_REID":"False ",
                "THRESHOLD":0.92,
                "BATCH_SIZE":8,
                "CLASSES_NAME":'{"head":"0","body":"1","cat":"2","dog":"3"}',

                "USE_IOU_SCORE_ONLY":"False",
            },
            "networks": ["stream-kafka"],
            "depends_on": ["pythera_detection"]
        },

        # 4. POSE DETECTION
        "pose_detection": {
            "image": "tanmai0502/pose-detection:latest",
            "container_name": f"pose_detection{suffix}",
            "restart": "unless-stopped",
            "environment": {
                **base_ai_env,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "CONSUMER_GROUP": f"pose_group{suffix}",
                "MODEL_NAME": "pose_ensemble",
                "FRAME_RATE": 27,
                "VERSION": 1,
                "THRESHOLD": 0.2,
                "BATCH_SIZE": 4
            },
            "networks": ["stream-kafka"],
            "depends_on": ["tracking_service"]
        },

        # 5. ACTION RECOGNITION
        "action_recognition": {
            "image": "tanmai0502/action-recognition:latest",
            "container_name": f"action_recognition{suffix}",
            "restart": "unless-stopped",
            "environment": {
                **base_ai_env,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "CONSUMER_GROUP": f"action_group{suffix}",
                "MODEL_NAME": "fall_ensemble",
                "VERSION": 1,
                "FRAME_RATE": 27,
                "THRESHOLD": 0.25,
                "MAX_FRAMES": 30,
                "SLIDE_STEP": 1,
                "FRAME_SKIP": 1,
                "MAX_AGE": 100,
                "BATCH_SIZE": 4,
                "CLASSES": '{"-1":"","0":"Standing","1":"Walking","2":"Sitting","3":"Lying Down","4":"Stand up","5":"Sit down","6":"Fall Down"}'
            },
            "networks": ["stream-kafka"],
            "depends_on": ["pose_detection"]
        },

        # 6. FACE SERVICE (Cập nhật chuẩn mới EXT_ và SEARCH_URL)
        "face_service": {
            "image": "tanmai0502/face-service:latest",
            "container_name": f"face_service{suffix}",
            "restart": "unless-stopped",
            "environment": {
                "KAFKA_BOOTSTRAP": KAFKA_HOST,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "BATCH_SIZE": 4,
                "QUEUE_SIZE": 200,
                "CONSUMER_GROUP": f"face_service_group{suffix}",
                "VERBOSE": "false",
                
                # Detection Config
                "DET_MODEL_NAME": "landmark_ensemble",
                "DET_VERSION": 1,
                "DET_URL": AI_SERVER_URL,
                "DET_USE_GRPC": "True",
                "DET_THRESHOLD": 0.4,
                "DET_BATCH_SIZE": 8,
                "DET_CLASSES": '{"0":"face"}',

                # Feature Extraction Config (Đổi từ REG_ sang EXT_)
                "EXT_MODEL_NAME": "face_ensemble",
                "EXT_VERSION": 1,
                "EXT_URL": AI_SERVER_URL,
                "EXT_USE_GRPC": "True",
                "EXT_BATCH_SIZE": 8,

                # Search Config
                "SEARCH_URL": SEARCH_SERVER_URL,
                "SEARCH_THRESHOLD": 0.5,
                "COLLECTION_NAME": "FPT"
            },
            "networks": ["stream-kafka"],
            "depends_on": ["rtsp_reader"]
        },

        # 7. FIRE SERVICE
        "fire_service": {
            "image": "tanmai0502/fire-service:latest",
            "container_name": f"fire_service{suffix}",
            "restart": "unless-stopped",
            "environment": {
                "KAFKA_BOOTSTRAP": KAFKA_HOST,
                "INPUT_TOPIC": topic_in,
                "OUTPUT_TOPIC": topic_out,
                "BATCH_SIZE": 8,
                "QUEUE_SIZE": 200,
                "CONSUMER_GROUP": f"fire_service_group{suffix}",
                "VERBOSE": "false",
                
                # Detection Config
                "DET_URL": AI_SERVER_URL,
                "DET_NAME": "fire_det_ensemble",
                "DET_USE_GRPC": "True",
                "DET_CLASSES": '{"0":"Fire"}',
                "DET_VERSION": 1,
                
                # Classification Config
                "CLS_URL": AI_SERVER_URL,
                "CLS_NAME": "fire_cls_ensemble",
                "CLS_VERSION": 1,
                "CLS_USE_GRPC": "True",
                "CLS_CLASSES": '{"0":"Fire","1":"Normal","2":"Smoke"}'
            },
            "networks": ["stream-kafka"]
        },

        # 8. COUNTING SERVICE
        "counting_service": {
             "image": "tanmai0502/counting:latest",
             "container_name": f"counting_service{suffix}",
             "restart": "unless-stopped",
             "environment": {
                 "KAFKA_BOOTSTRAP": KAFKA_HOST,
                 "INPUT_TOPIC": topic_in,
                 "OUTPUT_TOPIC": topic_out,
                 "CONSUMER_GROUP": f"counting_group{suffix}",
                 "POLYGON_COORDS": "[]",
                 "INCLUDE_CLASSES": '["body"]',
                 "EXCLUDE_CLASSES": '[]',
                 "QUEUE_SIZE": 200,
                 "VERBOSE": "false" # Đổi key từ VERBOSE_LOGGING sang VERBOSE cho đồng bộ (hoặc giữ nguyên nếu image yêu cầu)
             },
             "networks": ["stream-kafka"],
             "depends_on": ["tracking_service"]
        }
    }
    return templates

def get_viewer_service_config(cam_id, port, input_topic, plot_mode="all", alert_mode="1"):
    suffix = f"_{cam_id}"
    return {
        "image": "tanmai0502/viewer-compare:latest",
        "container_name": f"viewer_service{suffix}",
        "restart": "unless-stopped",
        "environment": {
            "KAFKA_BOOTSTRAP": KAFKA_HOST,
            "CONSUMER_GROUP": f"pythera_group{suffix}",
            "INPUT_TOPIC": input_topic,
            "VIEWER_MODE": "web", # Mặc định là web cho FE, nếu muốn record video thì đổi thành 'video'
            "OUTPUT_FPS": 25,
            "VERSION": 1,
            # Các config ghi file video
            "OUTPUT_VIDEO_PATH": "/data",
            "VIDEO_FILENAME": f"{cam_id}.mp4",
            "VIDEO_CODEC": "mp4v",
            
            # WebSocket Config
            "WEBSOCKET_HOST": "0.0.0.0",
            "WEBSOCKET_PORT": str(port),
            "WEBSOCKET_QUALITY": 100,
            "WEBSOCKET_MAX_CLIENTS": 50,
            "WEBSOCKET_QUEUE": 300,
            
            # User Settings
            "PLOT": plot_mode,
            "ALERT": alert_mode,
            "INV_SCALE": "false",
            "VERBOSE": "false",
            "COMPARE": "false"
        },
        "ports": [f"{port}:{port}"],
        "volumes": [
            # Đường dẫn này nên để config động hoặc biến môi trường HOST_DATA_PATH
            "/data:/data"
        ],
        "networks": ["stream-kafka"]
    }