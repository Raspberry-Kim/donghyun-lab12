# 동현심™: 출처·이용 안내

동현심은 Nintendo DS판 「SimCity DS」(일본 2007-02-22, 북미 2007-06-19, 유럽 2007-06-22 · 개발 AKI Corporation·EA Japan, 발매 Electronic Arts)에서 따온 도시 만들기의 **뼈대**에서 영감을 받은 비상업적 취미 작품이다. SimCity DS는 「SimCity 3000」을 바탕으로 터치 펜으로 길·전선·구역을 놓도록 고친 작품이다. SimCity는 Electronic Arts의 상표이며, 원작은 각 권리자(Electronic Arts, Maxis, AKI Corporation 등)의 저작물이다. 동현심은 이들과 관계가 없고 승인도 받지 않았다.

## 원작에서 가져온 것

- 뼈대만 참고했다: 주거·상업·공업 구역을 놓고 길과 전력을 이으면 수요에 따라 건물이 자라는 것, 발전소·경찰서·소방서, 지가·오염·범죄, 세금과 유지비, 재해(불·범람·괴수), 인구에 따른 칭호, 소식 알림.
- 아주 작게 만들었다: 지도는 강이 흐르는 평지 하나, 구역은 3×3 셋, 건물은 발전소·경찰서·소방서·공원 넷. 상하수도·교통·세율·조례·자문관·시나리오·랜드마크·지형 만들기는 없다.
- 원작 게임의 그림·지도·음악·효과음·코드·글은 하나도 쓰지 않았다. 원작 파일과 그 일부는 이 저장소에 없다.
- 구체적인 수치(값, 유지비, 수요식, 성장 확률, 재해 빈도, 칭호 인구)는 모두 동현심이 정한 것이다.

## 동현심이 새로 만든 것

- 도시 엔진(`src/engine.js`: 전력 전달·길 닿기·수요·지가·오염·범죄·세금·이벤트·재해·저장), 판 화면과 마우스·터치 조작(`src/app.js`), 전체 화면, 동현랭 자금·이벤트·재해 규약과 예제(`src/examples.js`), 합성 효과음(`src/sfx.js`), 문서, 시험.
- 타일·건물·도구 그림 서른아홉은 `tools/tiles.py`가 글자 격자로 새로 그렸다(`src/tiles.js`).
- 동현랭 실행기(`src/donghyun.js`)는 [동현랭 저장소](https://github.com/Raspberry-Kim/donghyun-lang)의 v1.55를 고치지 않고 썼다. 소식에 나오는 얼굴(`src/sprites.js`)은 동현주의 16×16 그림을 고치지 않고 썼다. 전체 화면은 동현몬의 방식을, 휴대폰 경험(두 번 두드려도 확대되지 않기, 누른 자리 번짐 없애기, 판에서 끌어도 화면이 밀리지 않기)은 동현텐의 방식을 따랐다.
- 얼굴은 모두 동현 시리즈의 식구다: 포동이 시장(동현랭), 슈슈·라이언(동현파), 초파리(동현초), 둠가이(동현둠).

## 포동이

포동이는 만든 사람의 강아지다. 포동이의 이름과 모습(도트 그림 포함)에 대한 권리는 MIT 코드 라이선스와 별개로 만든 사람에게 있다. 코드를 가져다 쓸 때 포동이 그림과 이름은 바꿔 쓰기를 권한다.

## 참고한 자료

- SimCity DS — Wikipedia: https://en.wikipedia.org/wiki/SimCity_DS
- SimCity 3000 — Wikipedia: https://en.wikipedia.org/wiki/SimCity_3000
- SimCity (series) — Wikipedia: https://en.wikipedia.org/wiki/SimCity

## 글꼴

검은고딕 Black Han Sans · Pretendard · 나눔고딕코딩 — SIL Open Font License 1.1 (`licenses/`).

## 라이선스

동현심 코드·문서: MIT (`LICENSE`). 동현랭 실행기: MIT (`licenses/DONGHYUN-MIT.txt`).
