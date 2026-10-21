"""The whole journey in real browsers: python3 tests/journey.py [chromium|webkit|all|phones|dev]

Serves the repo over HTTP and plays the journey through its real taps (Python Playwright, with its Chromium and
WebKit: pip install playwright && playwright install chromium webkit):

  front page   the banner and Play; the first part loads behind it
  fishing 1    Popo's opening and a real catch in the first level; then its end (the mystery fish's question,
               Swiftee's "Let's find out!") and Next
  -> fishing 2 on camera, with no tap of its own: Swiftee flies off and the lake dissolves into fishing 2's lake,
               where Popo rows in; the seashell opens and the lesson's card springs out of its bubble; the lesson's
               own frame appears over the card, see-through, with no winter scene (screens 1 to 5 move on by
               themselves; there is no Next, Back or screen list; the voice plays through the journey's <audio>);
               a check after a concept, a wrong answer and the right one; then from the summary the lesson fades, the card closes and the shell
               shuts; Swiftee's welcome; a real catch; its end ("The End") and Next
  front page   again, with fishing 1 loaded behind it for Play again; and Play again starts it

Checks that one game plays at a time, that the next parts load while the one before them plays, that every part
plays through the journey's one unlocked AudioContext, that the lesson's frame sits exactly on the card fishing 2
draws, that each step is announced to a hosting page, and that no frame logs an error. `phones` takes the front page and fishing 1 at phone sizes (screenshots only).
`dev` checks the ways in for testing: ?dev=1's one jump panel (a lesson screen opens fishing 2's card with the
lesson at that screen; a fishing 2 level closes it; Front page), ?start=lesson, and the lesson's frame following
the card when the window is resized.
Screenshots go to /tmp/fishing-frenzy-journey (or $TA_SHOTS).
"""
import functools
import http.server
import os
import sys
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path(os.environ.get('TA_SHOTS', '/tmp/fishing-frenzy-journey'))

# every frame keeps its own uncaught errors, and the journey's announcements
INIT = '''window.__errs = [];
addEventListener('error', (e) => { if (e.message) window.__errs.push(location.pathname + ': ' + e.message); });
addEventListener('unhandledrejection', (e) => window.__errs.push(location.pathname + ': rejected ' + (e.reason && e.reason.message || e.reason)));
if (window.top === window) { window.__said = []; for (const k of ['part', 'finished', 'complete'])
  addEventListener('fishing-frenzy:' + k, (e) => window.__said.push([k, e.detail])); }'''

SHELL = '''() => { const T = window.FishingFrenzy;
  return { phase: T.phase, current: T.current, f1: T.status('fishing-1'), lesson: T.status('lesson'), f2: T.status('fishing-2'),
           frames: document.querySelectorAll('iframe.part').length, live: document.querySelectorAll('iframe.part.live').length,
           cover: !document.getElementById('cover').hidden, veil: document.getElementById('veil').className,
           leaving: [...document.querySelectorAll('iframe.part.leaving')].map(f => f.title),
           ctx: T.audio.ctx ? T.audio.ctx.state : null, inset: T.inset,
           insetIn: !!document.querySelector('iframe.part.inset.in'),
           insetRect: (() => { const e = document.querySelector('iframe.part.inset'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })() }; }'''

FISH = '''() => { const d = window.popoDebug; if (!d) return null; const s = d.state, g = d.game;
  return { phase: s.phase, caught: s.collected.length, next: !document.getElementById('btn-next').hidden,
           shared: !!g.audio.ctx && g.audio.ctx === parent.FishingFrenzy.audio.ctx,
           popoHome: !g.popo.travelShift, card: !!(g.recall && g.recall.lesson && (g.lessonOpen || (g.recall.emerge > 0 && !g.recall.cardOut))), lessonOpen: !!g.lessonOpen,
           cardRect: (() => { const r = g.cardRect && g.cardRect(); return r ? [r.x, r.y, r.w, r.h] : null; })(),
           hud: document.getElementById('hud').hidden, swiftee: !!g.swiftee,
           zoom: g.camera ? g.camera.zoom : 1, shadows: (g.ambient || []).length }; }'''

# a fish to tap, in client px (the part's frame fills the window): one to catch (right) or not
PICK1 = '''(right) => { const d = window.popoDebug, s = d.state, k = d.game.stage.scale, c = document.getElementById('stage').getBoundingClientRect();
  const f = s.fish.find(f => !f.gone && !f.offstage && !f.escaping && f.x > 140 && f.x < 1530 && PopoGame.matchesTarget(f.key, s.target) === right);
  return f ? [f.x * k + c.left, f.y * k + c.top] : null; }'''
PICK2 = '''(right) => { const d = window.popoDebug, s = d.state, k = d.game.stage.scale, c = document.getElementById('stage').getBoundingClientRect();
  const f = s.fish.find(f => !f.gone && !f.offstage && !f.escaping && f.x > 140 && f.x < 1530 && f.correct === right);
  return f ? [f.x * k + c.left, f.y * k + c.top] : null; }'''

LESSON = '''() => { const e = window.lessonDebug; if (!e) return null;
  let a = null; try { a = parent.FishingFrenzy.audio; } catch (err) { a = null; } // (from disk the parent can't be read)
  const bg = document.querySelector('.stage img.bg-winter');
  return { step: e.state.step, of: e.steps().length, started: e.state.started, done: e.state.done, line: e.state.line,
           shared: !!a && !!e.actx && e.actx === a.ctx, voice: a ? (a.el.paused ? '' : a.el.currentSrc) : '',
           nav: document.querySelectorAll('[data-qa="nav-next"], [data-qa="nav-back"], [data-qa="screens"]').length,
           inCard: document.documentElement.classList.contains('in-card'),
           seeThrough: getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(document.querySelector('.stage')).backgroundColor === 'rgba(0, 0, 0, 0)',
           winterHidden: !!bg && getComputedStyle(bg).display === 'none' }; }'''

passed = []


def check(ok, what, detail=''):
    print(('PASS ' if ok else 'FAIL ') + what + (f' -- {detail}' if detail else ''), flush=True)
    if not ok:
        raise SystemExit(1)
    passed.append(what)


def serve():
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}/'


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def until(fn, cond, timeout, what):
    end = time.time() + timeout
    last = None
    while time.time() < end:
        try:
            last = fn()
        except Exception as e:  # a frame being swapped
            last = f'({e.__class__.__name__})'
        if not isinstance(last, str) and last is not None and cond(last):
            return last
        time.sleep(0.15)
    raise SystemExit(f'FAIL timed out: {what}; last {last}')


def part(page, name):
    for f in page.frames:
        if f'/parts/{name}/' in f.url:
            return f
    return None


def tap(page, frame, pick, right=True, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        pt = frame.evaluate(pick, right)
        if pt:
            page.mouse.click(*pt)
            return True
        time.sleep(0.1)
    return False


def catch_one(page, frame, pick, label):
    for _ in range(6):  # a fish can swim out from under the tap: try again
        st = until(lambda: frame.evaluate(FISH), lambda s: s['phase'] == 'ready', 120, f'{label} ready to fish')
        if not tap(page, frame, pick):
            continue
        try:
            until(lambda: frame.evaluate(FISH), lambda s: s['caught'] > st['caught'], 25, 'the catch')
            return
        except SystemExit:
            pass
    raise SystemExit(f'FAIL {label}: no catch landed')


def errors_in(page):
    out = []
    for f in page.frames:
        try:
            out += f.evaluate('() => window.__errs || []')
        except Exception:
            pass
    return out


def launch(p, engine):
    """The engine Playwright expects, or else the newest of that engine already installed on this machine."""
    try:
        return getattr(p, engine).launch()
    except Exception:
        import glob
        builds = sorted(glob.glob(os.path.expanduser(f'~/Library/Caches/ms-playwright/{engine}-*/pw_run.sh')) +
                        glob.glob(os.path.expanduser(f'~/.cache/ms-playwright/{engine}-*/pw_run.sh')))
        if not builds:
            raise
        return getattr(p, engine).launch(executable_path=builds[-1])


def journey(p, engine):
    SHOTS.mkdir(parents=True, exist_ok=True)
    srv, url = serve()
    browser = launch(p, engine)
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    console = []
    page.on('console', lambda m: console.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: console.append(str(e)))
    shell = lambda: page.evaluate(SHELL)
    tag = engine

    page.goto(url + '?debug')
    st = until(shell, lambda s: s['f1'] == 'ready', 60, 'fishing 1 loads behind the front page')
    check(st['cover'] and st['frames'] == 1 and st['live'] == 0, f'{tag}: the front page shows; fishing 1 has loaded, unseen, behind it')
    page.wait_for_timeout(2600)  # the cover's entrance (title, Play)
    page.screenshot(path=str(SHOTS / f'{tag}-1-front-page.png'))

    # ---------- Play -> fishing 1 ----------
    page.click('#play', force=True)
    st = until(shell, lambda s: s['current'] == 'fishing-1' and not s['cover'], 10, 'Play starts fishing 1')
    check(st['ctx'] == 'running', f'{tag}: Play starts fishing 1 and unlocks the sound', st['ctx'])
    f1 = part(page, 'fishing-1')
    fs = until(lambda: f1.evaluate(FISH), lambda s: s['phase'] != 'intro', 10, 'fishing 1 begins')
    check(fs['shared'], f'{tag}: fishing 1 plays through the journey\'s AudioContext')
    page.wait_for_timeout(3500)
    page.screenshot(path=str(SHOTS / f'{tag}-2-fishing-1.png'))
    for n in range(4):  # four shapes, one catch each, on the same lake (no rowing on)
        catch_one(page, f1, PICK1, f'{tag}: fishing 1 round {n + 1}')
    check(True, f'{tag}: fishing 1: a catch of each of the four shapes lands in the bucket')
    st = until(shell, lambda s: s['lesson'] in ('loading', 'ready'), 15, 'the lesson starts loading')
    check(True, f'{tag}: the lesson loads behind fishing 1 while it plays', st['lesson'])

    # its end, straight after the fourth catch: the mystery fish's question, Swiftee's "Let's find out!" and Next
    until(lambda: f1.evaluate(FISH), lambda s: s['next'], 40, 'fishing 1 shows Next')
    page.screenshot(path=str(SHOTS / f'{tag}-3-fishing-1-end.png'))
    f1.locator('#btn-next').click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / f'{tag}-4a-swiftee-takes-off.png'))
    st = until(shell, lambda s: s['leaving'] and s['live'] == 2, 5, 'the lake dissolves into fishing 2')
    check(st['current'] == 'fishing-2' and 'on' not in st['veil'],
          f'{tag}: Next on fishing 1: Swiftee flies off, the giant wave carries Popo away and its lake cross-fades into fishing 2\'s (no veil)', ', '.join(st['leaving']))
    page.wait_for_timeout(600)
    page.screenshot(path=str(SHOTS / f'{tag}-4b-dissolve.png'))

    # ---------- fishing 2: Popo rows in, the shell opens, and the lesson plays in its card ----------
    st = until(shell, lambda s: s['current'] == 'fishing-2' and not s['leaving'], 30, 'fishing 2 begins')
    check(st['live'] == 1 and st['f1'] is None, f'{tag}: fishing 2 begins with no tap of its own; fishing 1 is gone')
    f2 = part(page, 'fishing-2')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['shared'], 10, 'fishing 2 sound')
    check(fs['shared'], f'{tag}: fishing 2 plays through the journey\'s AudioContext')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['card'], 40, 'the shell opens and the card rises')
    check(fs['phase'] == 'recall' and fs['hud'] and not fs['popoHome'], f'{tag}: the seashell opens on the empty lake and the card rises (Popo is still away on the wave; the buttons step aside)')
    page.wait_for_timeout(2200)
    page.screenshot(path=str(SHOTS / f'{tag}-5a-shell-opens.png'))
    page.wait_for_timeout(2600)
    page.screenshot(path=str(SHOTS / f'{tag}-5b-bubble-rises.png'))
    st = until(shell, lambda s: s['insetIn'] and s['inset'] == 'lesson', 40, 'the lesson shows in the card')
    fs = f2.evaluate(FISH)
    r, c = st['insetRect'], fs['cardRect']
    fits = c and all(abs(r[i] - c[i]) < 1.5 for i in range(4)) and r[0] > 0 and r[1] > 0 and r[0] + r[2] < 1280 and r[1] + r[3] < 720
    check(fits and fs['lessonOpen'] and st['current'] == 'fishing-2', f'{tag}: the lesson\'s frame sits exactly on the card fishing 2 draws, inside the window', f'frame {[round(v) for v in r]}')
    lf = part(page, 'lesson')
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['started'] and s['line'], 15, 'the lesson speaks')
    check(ls['inCard'] and ls['seeThrough'] and ls['winterHidden'], f'{tag}: the lesson is on the card: see-through, with no winter scene or snow')
    check(ls['of'] == 33 and ls['nav'] == 0, f'{tag}: the lesson has 33 screens and no Next, Back or screen list', f"{ls['of']} screens, {ls['nav']} buttons")
    check('Any polygon with 4 sides' in ls['line'], f'{tag}: screen 1 opens with Swiftee\'s first line', ls['line'])
    check(ls['shared'], f'{tag}: the lesson plays through the journey\'s AudioContext')
    if engine == 'chromium':
        v = until(lambda: lf.evaluate(LESSON), lambda s: 'parts/lesson/assets/vo/' in s['voice'], 10, 'the voice-over plays')
        check(True, f'{tag}: the voice-over plays in the journey\'s unlocked <audio>', v['voice'].split('/')[-1])
    page.wait_for_timeout(1500)
    page.screenshot(path=str(SHOTS / f'{tag}-5c-lesson-in-card.png'))
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['step'] >= 4, 90, 'the lesson moves on by itself')
    check(True, f'{tag}: screens 1-5 move on by themselves', f"now screen {ls['step'] + 1}")
    fs = f2.evaluate(FISH)
    check(fs['zoom'] > 1.7 and fs['shadows'] >= 5, f'{tag}: behind the card the camera has dived into the water, with shadow fish swimming', f"zoom {fs['zoom']:.2f}, {fs['shadows']} shadows")

    # a check now follows each concept: on the one after the sides (the missing side), a wrong answer keeps the lesson
    # there and the right one moves it on; then from the summary, the lesson's last screen, it ends by itself and the
    # card closes
    order = lf.evaluate('() => lessonDebug.steps().map((x) => x.id)')
    k5, kr = order.index('cfu5'), order.index('recap')
    check(order.index('cfu1') == order.index('defFull') + 1 and k5 == order.index('iso') + 1 and order.index('cfu3') == order.index('rule') + 1
          and order.index('cfu2') == order.index('right') + 1 and kr == len(order) - 1,
          f'{tag}: each check follows its concept, and the summary ends the lesson', ', '.join(f"{c}@{order.index(c) + 1}" for c in ('cfu1', 'cfu5', 'cfu3', 'cfu2', 'cfu4')))
    lf.evaluate(f'() => window.lessonDebug.jumpTo({k5})')
    lf.locator('[data-qa="opt-a"]').wait_for(state='visible', timeout=40000)
    page.wait_for_timeout(1200)
    lf.locator('[data-qa="opt-a"]').click()
    page.wait_for_timeout(2500)
    ls = lf.evaluate(LESSON)
    check(ls['step'] == k5 and not ls['done'], f'{tag}: a wrong answer on a check keeps the lesson there')
    page.screenshot(path=str(SHOTS / f'{tag}-6a-lesson-check.png'))
    lf.locator('[data-qa="opt-b"]').click()
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['step'] == k5 + 1, 40, 'the right answer moves the lesson on')
    check(True, f'{tag}: the right answer moves the lesson on to the next concept')
    lf.evaluate(f'() => window.lessonDebug.jumpTo({kr})')
    lf.locator('[data-qa="sum-next"]').wait_for(state='visible', timeout=180000)
    page.wait_for_timeout(3000)
    check(shell()['insetIn'], f'{tag}: the summary waits for Next (no moving on by itself)')
    page.screenshot(path=str(SHOTS / f'{tag}-6b-summary-next.png'))
    lf.locator('[data-qa="sum-next"]').click(force=True)  # (it bobs to call for the tap, so it is never 'stable')
    st = until(shell, lambda s: not s['insetIn'], 30, 'the lesson hands over after Next')
    page.screenshot(path=str(SHOTS / f'{tag}-6c-lesson-fades.png'))
    res = page.evaluate('() => FishingFrenzy.results')
    check(res.get('lesson', {}).get('results', {}).get('cfu5') is False, f'{tag}: after the summary\'s Next the lesson hands over and reports its checks (that one missed first time)')
    fs = until(lambda: f2.evaluate(FISH), lambda s: not s['card'], 20, 'the card closes')
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / f'{tag}-6d-card-closes.png'))
    check(not fs['lessonOpen'], f'{tag}: the card shrinks away into its bubble')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['zoom'] < 1.05, 10, 'the camera comes back up')
    check(True, f'{tag}: the camera comes back up to the surface', f"zoom {fs['zoom']:.2f}")
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['popoHome'], 25, 'the wave brings Popo in')
    check(not fs['hud'], f'{tag}: the giant wave rolls in with Popo riding it, sweeps the shell away and sets him down; the buttons are back')
    until(shell, lambda s: s['lesson'] is None and s['inset'] is None, 5, 'the lesson\'s frame is gone')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['swiftee'], 20, 'Swiftee swoops in')
    check(True, f'{tag}: Swiftee swoops back in with her welcome')
    page.wait_for_timeout(2500)
    page.screenshot(path=str(SHOTS / f'{tag}-7-fishing-2-welcome.png'))
    catch_one(page, f2, PICK2, f'{tag}: fishing 2')
    check(True, f'{tag}: fishing 2: a real catch lands in the bucket')

    # its end, as its dev panel's Finale: the celebration, the big catch, "The End" and Next
    f2.evaluate('''() => { const g = window.popoDebug.game, s = window.popoDebug.state, L = PopoGame.LEVELS;
      g.reset(); g.startLevel(L.length - 1); g.play(); s.levelCaught = L[L.length - 1].catches; PopoGame.finishLevel(g); }''')
    until(lambda: f2.evaluate(FISH), lambda s: s['next'], 150, 'fishing 2 shows Next at The End')
    page.screenshot(path=str(SHOTS / f'{tag}-8-the-end.png'))
    st = until(shell, lambda s: s['f1'] == 'ready', 60, 'fishing 1 loads again for Play again')
    check(True, f'{tag}: fishing 1 is loaded again behind fishing 2, for Play again')
    f2.locator('#btn-next').click()

    # ---------- the front page again ----------
    st = until(shell, lambda s: s['phase'] == 'cover' and s['cover'], 15, 'the front page comes back')
    st = until(shell, lambda s: s['f2'] is None, 5, 'fishing 2 is removed')
    check(st['frames'] == 1 and st['live'] == 0, f'{tag}: the journey ends on the front page, ready to play again')
    said = page.evaluate('() => window.__said.map(([k, d]) => k + ":" + (d.part || ""))')
    check(said == ['part:fishing-1', 'finished:fishing-1', 'part:fishing-2', 'part:lesson', 'finished:lesson', 'finished:fishing-2', 'complete:'],
          f'{tag}: every step is announced in order', ', '.join(said))
    page.wait_for_timeout(2600)
    page.screenshot(path=str(SHOTS / f'{tag}-9-front-page-again.png'))
    page.click('#play', force=True)
    until(shell, lambda s: s['current'] == 'fishing-1' and not s['cover'], 10, 'Play again')
    check(True, f'{tag}: Play again starts fishing 1 at once')

    errs = errors_in(page) + console
    check(not errs, f'{tag}: no errors in any frame', '; '.join(errs[:4]))
    browser.close()
    srv.shutdown()


def phones(p):
    SHOTS.mkdir(parents=True, exist_ok=True)
    srv, url = serve()
    browser = launch(p, 'chromium')
    for name, size in [('phone-landscape', (844, 390)), ('phone-portrait', (390, 844)), ('tablet', (1024, 768))]:
        ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]}, is_mobile=True, has_touch=True, device_scale_factor=2)
        ctx.add_init_script(INIT)
        page = ctx.new_page()
        page.goto(url)
        until(lambda: page.evaluate(SHELL), lambda s: s['f1'] == 'ready', 60, 'fishing 1 loads')
        page.wait_for_timeout(2600)
        page.screenshot(path=str(SHOTS / f'{name}-front-page.png'))
        page.tap('#play', force=True)
        until(lambda: page.evaluate(SHELL), lambda s: s['current'] == 'fishing-1', 10, 'Play')
        page.wait_for_timeout(4000)
        page.screenshot(path=str(SHOTS / f'{name}-fishing-1.png'))
        errs = errors_in(page)
        check(not errs, f'{name}: front page and fishing 1 with no errors', '; '.join(errs[:3]))
        ctx.close()
    browser.close()
    srv.shutdown()


def devjumps(p):
    SHOTS.mkdir(parents=True, exist_ok=True)
    srv, url = serve()
    browser = launch(p, 'chromium')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    shell = lambda: page.evaluate(SHELL)
    # ?start=lesson: Play goes straight to the lesson's open card
    page.goto(url + '?start=lesson&debug')
    until(shell, lambda s: s['f2'] == 'ready' and s['lesson'] == 'ready', 60, 'fishing 2 and the lesson load')
    page.click('#play', force=True)
    st = until(shell, lambda s: s['insetIn'] and s['inset'] == 'lesson', 15, 'the lesson shows in the card')
    f2 = part(page, 'fishing-2')
    fs = f2.evaluate(FISH)
    check(not fs['popoHome'] and fs['card'] and fs['lessonOpen'] and st['current'] == 'fishing-2', 'dev: ?start=lesson: Play goes straight to the open card (Popo comes on the wave after the lesson, as in the journey)')
    # the window changes: the card moves, and the lesson's frame with it
    page.set_viewport_size({'width': 1000, 'height': 700})
    page.wait_for_timeout(600)
    st, fs = shell(), f2.evaluate(FISH)
    r, c = st['insetRect'], fs['cardRect']
    check(all(abs(r[i] - c[i]) < 1.5 for i in range(4)) and r[0] + r[2] < 1000 and r[1] + r[3] < 700, 'dev: the lesson\'s frame follows the card when the window changes', f'frame {[round(v) for v in r]}')
    page.set_viewport_size({'width': 1280, 'height': 720})
    page.wait_for_timeout(400)
    page.screenshot(path=str(SHOTS / 'dev-1-start-lesson.png'))
    # the lesson over: the card closes and the giant wave brings Popo in, as in the full journey
    part(page, 'lesson').evaluate('() => lessonDebug.handOff()')
    waved = until(lambda: f2.evaluate('() => !!(window.popoDebug && popoDebug.game.wave)'), lambda w: w, 20, 'the wave rolls in after the lesson')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['popoHome'], 20, 'the wave brings Popo in')
    check(waved and fs['popoHome'], 'dev: after the lesson the wave brings Popo in')
    browser.close()

    # ?dev=1: the jump panel
    browser = launch(p, 'chromium')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    page.goto(url + '?dev=1&debug')
    until(shell, lambda s: s['f1'] == 'ready' and s['f2'] == 'ready' and s['lesson'] == 'ready', 90, 'every part loads for the panel')
    page.wait_for_function('() => document.querySelectorAll(".dev button.j").length > 50', timeout=30000)
    page.click('.dev-tag')
    lesson_btn = lambda n: page.locator(f'.dev-part[data-part="lesson"] button.j').nth(n)
    lesson_btn(9).click()
    st = until(shell, lambda s: s['insetIn'] and s['inset'] == 'lesson' and s['current'] == 'fishing-2', 20, 'a lesson screen opens the card')
    lf = part(page, 'lesson')
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['step'] == 9, 15, 'the lesson at screen 10')
    check(ls['inCard'] and not st['cover'], 'dev: a lesson screen in the panel opens fishing 2\'s card with the lesson at that screen', f"screen {ls['step'] + 1}")
    page.wait_for_timeout(2500)  # (and stays there: Swiftee's flight in used to start() the lesson over, back on screen 1)
    ls = lf.evaluate(LESSON)
    check(ls['step'] == 9, 'dev: the lesson is still at that screen once it has settled', f"screen {ls['step'] + 1}")
    page.screenshot(path=str(SHOTS / 'dev-2-lesson-screen-10.png'))
    lesson_btn(29).click()
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['step'] == 29, 15, 'the lesson at screen 30')
    check(shell()['insetIn'], 'dev: another lesson screen keeps the card up and jumps inside it', f"screen {ls['step'] + 1}")
    page.locator('.dev-part[data-part="fishing-2"] button.j', has_text='L3').first.click()
    st = until(shell, lambda s: not s['insetIn'] and s['inset'] is None, 10, 'a fishing 2 level closes the card')
    f2 = part(page, 'fishing-2')
    fs = until(lambda: f2.evaluate(FISH), lambda s: s['phase'] == 'ready' and not s['card'], 20, 'fishing 2 at level 3')
    check(not fs['lessonOpen'] and not fs['hud'], 'dev: a fishing 2 level closes the card and the lesson goes; fishing is on')
    lesson_btn(0).click()
    st = until(shell, lambda s: s['insetIn'] and s['inset'] == 'lesson', 25, 'back to the lesson')
    lf = part(page, 'lesson')
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['started'] and s['step'] == 0, 15, 'screen 1')
    check(True, 'dev: back to a lesson screen: the card opens again with the lesson')
    page.locator('.dev button.j.home').click()
    st = until(shell, lambda s: s['phase'] == 'cover' and s['cover'] and s['inset'] is None, 10, 'the front page')
    check(st['live'] == 0, 'dev: Front page puts the journey back on its front page')
    errs = errors_in(page)
    check(not errs, 'dev: no errors in any frame', '; '.join(errs[:4]))
    browser.close()
    srv.shutdown()

    # opened from disk (file://): the parts can't reach the shell's script, so the panel's lists and its jumps go by message
    browser = launch(p, 'chromium')
    ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    page.goto((ROOT / 'index.html').as_uri() + '?dev=1&debug')
    page.wait_for_function('() => document.querySelectorAll(".dev-part[data-part=lesson] button.j").length >= 33', timeout=120000)
    check(True, 'dev: from disk, the panel lists every part\'s screens')
    page.click('.dev-tag')
    page.locator('.dev-part[data-part="lesson"] button.j').nth(2).click()
    st = until(shell, lambda s: s['insetIn'] and s['inset'] == 'lesson' and s['current'] == 'fishing-2', 40, 'a lesson screen, from disk')
    lf = part(page, 'lesson')
    ls = until(lambda: lf.evaluate(LESSON), lambda s: s['step'] == 2, 15, 'the lesson at screen 3, from disk')
    check(ls['inCard'], 'dev: from disk, a lesson screen opens the card with the lesson at that screen', f"screen {ls['step'] + 1}")
    browser.close()


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'chromium'
    with sync_playwright() as p:
        if which in ('chromium', 'all'):
            journey(p, 'chromium')
        if which in ('webkit', 'all'):
            journey(p, 'webkit')
        if which in ('phones', 'all'):
            phones(p)
        if which in ('dev', 'all'):
            devjumps(p)
    print(f'ALL PASSED ({len(passed)} checks); screenshots in {SHOTS}')
