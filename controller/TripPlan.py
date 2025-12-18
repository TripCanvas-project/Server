import pandas as pd
import os
import sys
from datetime import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv
import json
from pymongo import MongoClient
import time
import random

def log(*args):
    print(*args, file=sys.stderr)

def out_json(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()

sys.stdout.reconfigure(encoding="utf-8")
log("ARGV:", sys.argv)
load_dotenv()
CONNECTION_STRING = os.getenv("DBURL")
API_KEY = os.getenv("GOOGLE_API")
client = genai.Client(api_key=API_KEY)
MODEL_NAME = "gemini-2.5-flash"


# --- 1. tripdata 불러오기 ---

client_m = MongoClient(CONNECTION_STRING)
DATABASE = "ProjectData"
COLLECTION_PLACE = "place"
db = client_m[DATABASE]
collection = db[COLLECTION_PLACE]

projection = {
    # 1. 원하는 최상위 필드
    "title": 1,
    "category": 1,
    
    # 2. 원하는 중첩 필드 (address 객체 내의 city, district)
    "address.city": 1,
    "address.district": 1,
    
    # 3. 원하는 중첩 필드 (coordinates 객체 내의 coordinates 배열)
    "coordinates.coordinates": 1,
    
    # 4. 기본으로 포함되는 _id 필드는 제외
    "_id": 0 
}

cursor = collection.find({}, projection)
data_list = list(cursor)

df = pd.DataFrame(data_list)
df['city'] = df['address'].apply(lambda x: x.get('city'))
df['district'] = df['address'].apply(lambda x: x.get('district'))
df['x'] = df['coordinates'].apply(lambda x: x.get('coordinates')[0])
df['y'] = df['coordinates'].apply(lambda x: x.get('coordinates')[1])

df = df.drop('address', axis=1)
df = df.drop('coordinates', axis=1)

log(df.head(1))

# def main():
#     input_data = sys.stdin.read()
#     user_input = json.loads(input_data)

#     print("[OK] 받은 사용자 입력:")
#     print(user_input["start_loc"])

# if __name__ == "__main__":
#     main()

# --- 2. 사용자 입력 받기 (수정됨: 숙소 테마 자동 결정) ---
def get_user_inputs():
    """사용자로부터 여행 계획에 필요한 정보를 입력받고, 장소 테마에 따라 숙소 테마를 자동 결정합니다."""
    
    input_data = sys.stdin.read()
    user_input = json.loads(input_data)
    
    start_loc = user_input["start_loc"]
    # city 값은 tripdata['city'].unique()에서 확인하여 입력하는 것을 권장합니다.
    end_city = user_input["end_area"]
    district = user_input["detail_addr"]
    
    # 날짜 입력 및 기간 계산
    while True:
        try:
            start_date_str = user_input["start_date"]
            end_date_str = user_input["end_date"]
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            
            if start_date > end_date:
                log("시작날짜가 종료날짜보다 앞에 있어야 됩니다.")
                continue
            
            duration = (end_date - start_date).days + 1
            break
        except ValueError:
            log("날짜 형식이 올바르지 않습니다.")

    try:
        budget = user_input["budget_per_person"]
        people = user_input["total_people"]
    except ValueError:
        log("예산과 인원수는 숫자로 입력해야 합니다.")
        exit()
        
    # 🌟 장소 테마 입력 받기 🌟
    place_theme = user_input["place_themes"]
    place_themes_list = [t.strip() for t in place_theme.split(',')]
    
    # 🌟 숙소 테마 자동 결정 (수정된 로직) 🌟
    # 장소 테마에 '캠핑'이 있으면 숙소 테마를 '캠핑'으로 설정, 아니면 '숙소'로 설정
    if '캠핑' in place_themes_list:
        accommodation_theme = "캠핑"
    else:
        accommodation_theme = "숙소"
        
    log(f"\n[자동 설정된 숙소 테마]: {accommodation_theme}")
    
    return {
        "start_loc": start_loc,
        "end_city": end_city,
        "district": district,
        "start_date": start_date_str,
        "end_date": end_date_str,
        "duration": duration,
        "budget_per_person": budget,
        "total_people": people,
        "place_themes": place_themes_list, # 장소 테마
        "accommodation_theme": accommodation_theme, # 숙소 테마 (자동 결정 값 사용)
        "userid": user_input["userId"]
    }

# --- 3. 데이터 필터링 및 전처리 (수정 없음, 'accommodation_theme' 변수 사용 로직 유지) ---
def filter_and_format_data(df, end_city, district, place_themes, accommodation_theme):
    """장소는 사용자가 입력한 테마로, 숙소는 결정된 숙소 테마로 분리하여 필터링합니다."""
    
    # 1. 지역 필터링 (공통)
    df_city = df[(df['city'] == end_city) & (df['district'] == district)].copy()
    
    if df_city.empty:
        log(f"\n'{end_city}' 지역에 해당하는 장소를 찾을 수 없습니다.")
        return None

    # 2. 장소 목록 필터링 (city + place_themes 사용)
    if place_themes and place_themes != ['']:
        # 2-1. 장소 후보 마스크 (place_themes에 포함)
        place_candidate_mask = df_city['category'].apply(
            lambda x: any(theme in str(x) for theme in place_themes) if pd.notna(x) else False
        )
    else:
        # 장소 테마가 없으면, 지역 내 모든 항목을 후보로 설정
        place_candidate_mask = df_city['title'].apply(lambda x: True)
    
    
    # 최종 장소 마스크: 장소 후보이면서 숙소 테마가 아닌 것
    final_place_mask = place_candidate_mask
    df_places = df_city[final_place_mask].copy()

    # 3. 숙소 목록 필터링 (city + accommodation_theme 변수 사용)
    # 결정된 accommodation_theme 변수 값(예: '캠핑' 또는 '숙소')으로 필터링
    accommodation_mask = df_city['category'].apply(
        lambda x: accommodation_theme in str(x) if pd.notna(x) else False
    )
    df_accommodations = df_city[accommodation_mask].copy()
    
    # 4. Gemini에게 전달할 데이터 형식화
    
    # 4-1. 장소 후보 목록 형식화 (기존 로직 유지)
    formatted_places = []
    if not df_places.empty:
        places_data = df_places[[ 'title', 'y', 'x' ]].fillna("없음").to_dict('records')
        for p in places_data:
            details = (
                f"이름: {p['title']}, "
                f"좌표: {p['y']}, {p['x']}" 
            )
            formatted_places.append(details)

    # 4-2. 숙소 후보 목록 형식화 (기존 로직 유지)
    formatted_accommodations = []
    if not df_accommodations.empty:
        accommodation_data = df_accommodations[[ 'title', 'y', 'x' ]].fillna("없음").to_dict('records')
        for a in accommodation_data:
            details = (
                f"이름: {a['title']}, "
                f"좌표: {a['y']}, {a['x']}"
            )
            formatted_accommodations.append(details)

    return formatted_places, formatted_accommodations

# --- 4. Gemini API 호출 함수 (수정 없음, 기존 JSON 구조 스키마 유지) ---
def generate_travel_plan(user_info, places_data, accommodation_data):
    """Gemini API를 호출하여 여행 계획을 생성합니다. (503 과부하 시 재시도 포함)"""

    # 전체 예산 계산
    total_budget = user_info["budget_per_person"] * user_info["total_people"]

    prompt = f"""
    당신은 전문 여행 플래너입니다. 아래의 정보와 장소 목록을 사용하여 {user_info['duration']}일간의 완벽한 여행 계획을 작성해 주세요. 사용자는 "{user_info['place_themes']}" 테마의 장소를 선호하며, 총 예산은 {total_budget}원이며, 숙소와 모든 활동이 포함되어야 합니다.
    여행 계획은 **JSON 형식**으로만 출력해야 합니다. 오류를 피하기 위해, 최상위 키 'travel_plan'의 값은 일자별 계획을 담은 **JSON 배열(List)**이어야 합니다. JSON 형식은 STRICTLY 아래의 요구사항과 **제공된 JSON 구조 예시**를 따라야 합니다.

    [여행 정보]
    출발지: {user_info['start_loc']}
    도착지/여행 지역: {user_info['end_city']}
    여행 기간: {user_info['duration']}일 ({user_info['start_date']} ~ {user_info['end_date']})
    총 예산: {total_budget}원 (숙소 및 모든 활동 포함)
    여행 인원: {user_info['total_people']}명
    여행자가 요청한 숙소/숙박 테마: {user_info['accommodation_theme']}

    [전체 장소 후보 목록] (places에 사용)
    {places_data}

    [숙소 후보 목록] (accommodation에 사용)
    {accommodation_data}

    [JSON 출력 구조 예시]
    {{
      "title": "여행의 전체 제목",
      "description": "전체 여행에 대한 간단한 설명",
      "travel_plan": [
        {{
          "day": 1,
          "places": [
            {{
              "name": "장소 이름 (전체 후보 목록에서 선택)",
              "description": "창의적인 설명",
              "coords": "위도, 경도",
              "estimated_cost": 50000,
              "closest_subway": "가장 가까운 지하철역 이름 또는 없음"
            }}
          ],
          "accommodation": {{
            "name": "숙소 이름 (숙소 후보 목록에서 선택)",
            "description": "숙소 설명 (창의적으로 작성)",
            "coords": "숙소의 위도, 경도 (숙소 후보 목록에서 선택)",
            "estimated_cost": 150000,
            "closest_subway": "가장 가까운 지하철역 이름 또는 없음"
          }}
        }}
      ]
    }}

    [JSON 출력 요구사항]
    1. 최상위 키는 'travel_plan'이며, 반드시 JSON 배열(List)이어야 합니다.
    2. 배열 내 각 객체는 'day'(숫자), 'places'(배열), 'accommodation'(객체)를 가져야 합니다.
    3. 'places'의 'name' 및 'coords'는 반드시 [전체 장소 후보 목록]에서 가져와야 합니다.
    4. 'accommodation'의 'name' 및 'coords'는 반드시 [숙소 후보 목록]에서 가져와야 합니다.
    5. 'closest_subway'는 coords를 참고하여 가장 가까운 지하철역 이름을 작성. 없으면 "없음".
    6. 'estimated_cost'는 숫자(integer)만.
    7. 시작날과 마지막날이 같다면 day=1, 숙소 이름은 "없음".
    8. 일자 별 places는 최소 2개 최대 4개, accommodation은 1개.

    최종 출력은 오직 요구된 JSON 형식이어야 합니다. 다른 텍스트는 포함하지 마세요.
    """

    print("⏳ Gemini API 요청 시작", file=sys.stderr)

    # --- JSON 스키마 정의 ---
    LocationDetails_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "name": types.Schema(type=types.Type.STRING),
            "description": types.Schema(type=types.Type.STRING),
            "coords": types.Schema(
                type=types.Type.STRING,
                description="위도, 경도 문자열 (예: 37.5665, 126.9780)"
            ),
            "estimated_cost": types.Schema(
                type=types.Type.INTEGER,
                description="총 소비 금액 (원)"
            ),
            "closest_subway": types.Schema(
                type=types.Type.STRING,
                description="가장 가까운 지하철역 이름 또는 '없음'"
            ),
        },
        required=["name", "description", "coords", "estimated_cost", "closest_subway"],
    )

    DailyPlan_schema = types.Schema(
        type=types.Type.OBJECT,
        properties={
            "day": types.Schema(type=types.Type.INTEGER, description="여행 일차 (1, 2, 3...)"),
            "places": types.Schema(
                type=types.Type.ARRAY,
                description="그날 방문할 장소 목록",
                items=LocationDetails_schema,
            ),
            "accommodation": LocationDetails_schema,
        },
        required=["day", "places", "accommodation"],
    )

    travel_plan_schema = types.Schema(
        type=types.Type.ARRAY,
        description="전체 여행 계획. 일자별 계획 객체의 배열",
        items=DailyPlan_schema,
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "title": types.Schema(type=types.Type.STRING, description="여행의 전체 제목"),
                "description": types.Schema(type=types.Type.STRING, description="전체 여행 설명"),
                "travel_plan": travel_plan_schema,
            },
            required=["title", "description", "travel_plan"],
        ),
    )
    # --- JSON 스키마 정의 끝 ---

    # ✅ 503 과부하 재시도 설정
    max_retries = 5
    base_delay = 1.5  # seconds

    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=config,
            )

            # JSON 파싱 시도
            try:
                result = json.loads(response.text)
                print("✅ Gemini 응답 JSON 파싱 성공", file=sys.stderr)
                return result
            except json.JSONDecodeError as je:
                last_error = f"JSONDecodeError: {je}"
                print(f"❌ Gemini 응답 JSON 파싱 실패: {je}", file=sys.stderr)
                print(f"응답 원문(앞부분): {response.text[:500]}", file=sys.stderr)
                return None

        except Exception as e:
            last_error = str(e)

            # ✅ 503 / UNAVAILABLE / overloaded -> 재시도
            msg = str(e)
            if ("503" in msg) or ("UNAVAILABLE" in msg) or ("overloaded" in msg):
                base_delay = base_delay * (2 ** (attempt)) + random.uniform(0, 0.5)
                print(
                    f"⚠️ Gemini 과부하(503) 재시도 {attempt}/{max_retries} - {delay:.1f}s 대기",
                    file=sys.stderr,
                )
                time.sleep(delay)
                continue

            # 그 외 오류는 즉시 실패 처리
            print(f"❌ Gemini API 호출 오류: {msg}", file=sys.stderr)
            return None

    print(f"❌ Gemini 503 재시도 초과로 실패: {last_error}", file=sys.stderr)
    return None

# --- 5. 메인 실행 로직 ---
if __name__ == "__main__":
    # 1. 사용자 입력 받기 (숙소 테마 자동 결정 포함)
    user_info = get_user_inputs()
    #    return {
    #     "start_loc": start_loc,
    #     "end_city": end_city,
    #     "district": district,
    #     "start_date": start_date_str,
    #     "end_date": end_date_str,
    #     "duration": duration,
    #     "budget_per_person": budget,
    #     "total_people": people,
    #     "place_themes": place_themes_list, # 장소 테마
    #     "accommodation_theme": accommodation_theme # 숙소 테마 (자동 결정 값 사용)
    # }
    
    # 2. 데이터 필터링 및 형식화
    # formatted_places, formatted_accommodations
    filter_results = filter_and_format_data(
        df, 
        user_info['end_city'],
        user_info['district'],
        user_info['place_themes'], # 장소 테마 사용
        user_info['accommodation_theme'] # 자동 결정된 숙소 테마 사용
    )
    if filter_results:
        formatted_places, formatted_accommodations = filter_results
        
        # 숙소 후보가 없으면 오류 메시지 출력 후 종료
        if not formatted_accommodations:
            log(f"\n오류: '{user_info['end_city']}' 지역에서 '{user_info['accommodation_theme']}' 테마를 가진 항목을 찾을 수 없습니다.")
        elif not formatted_places:
            log(f"\n오류: '{user_info['end_city']}' 지역에 장소 후보가 없습니다.")
        else:
            # 3. Gemini API 호출
            travel_plan_json = generate_travel_plan(
                user_info,
                formatted_places, 
                formatted_accommodations
            )
            log("Gemini 응답 수신 완료")
            
            # 4. 결과 출력
            if travel_plan_json:
                # 보기 좋게 JSON 출력
                out_json(travel_plan_json)
                trip_plan_json = json.dumps(travel_plan_json, indent=4, ensure_ascii=False)
                file_path = "travel_plan.json"
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(travel_plan_json, f, ensure_ascii=False, indent=4)
                except Exception as e:
                    log(f"\n파일 저장 중 오류가 발생했습니다: {e}")
            else:
                log("\n여행 계획 생성에 실패했습니다.")
                sys.exit(1)