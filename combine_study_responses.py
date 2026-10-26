#!/usr/bin/env python3
"""Combine manually returned Radial Tree Discussion Interface response JSON files into CSV.
No third-party packages. Researcher should keep the originals securely.
Usage: python combine_study_responses.py responses_folder --out study_responses.csv
"""
import argparse, csv, json
from pathlib import Path
from collections import Counter

def main():
    ap=argparse.ArgumentParser();ap.add_argument('folder',type=Path);ap.add_argument('--out',type=Path,default=Path('study_responses.csv'))
    args=ap.parse_args();rows=[];seen=set()
    for path in sorted(args.folder.glob('*.json')):
        if not (path.name.startswith('radial_tree_') or path.name.startswith('discussion_atlas_')) or not path.name.endswith('_responses.json'):
            continue
        try:d=json.loads(path.read_text(encoding='utf8'))
        except Exception as exc:print('INVALID',path.name,exc);continue
        if d.get('schema_version') not in ('3.1-static','3.2-static','3.3-static','4.0-static','4.1-static') or d.get('export_status')!='complete':
            print('SKIP draft or unrecognized file',path.name);continue
        pid=d.get('participant_id')
        if pid in seen:print('WARNING: duplicate study code',pid,'from',path.name)
        seen.add(pid)
        trials=d.get('trials',[])
        if len(trials)!=2:print('WARNING: expected two trials for',pid)
        for t in trials:
            counts=Counter(a.get('type') for a in t.get('viewer_actions',[]) if isinstance(a,dict))
            r=t.get('ratings') or {}; cr=t.get('cue_ratings') or {}; activities=t.get('tasks',[])
            row={'participant_id':pid,'assignment_group':d.get('assignment_group'), 'node_size_encoding':d.get('node_size_encoding','legacy_mixed'), 'trial':t.get('trial'), 'condition':t.get('condition'), 'case_id':t.get('case_id'), 'trial_node_size_encoding':t.get('node_size_encoding'),
                 'trial_elapsed_ms':t.get('total_trial_elapsed_ms'), 'viewer_exploration_ms':t.get('viewer_exploration_ms'),
                 'confidence':r.get('confidence'), 'rating_comment':r.get('comment'),
                 'cue_score':cr.get('score'), 'cue_length':cr.get('length'), 'cue_url':cr.get('url'), 'cue_question':cr.get('question'), 'cue_quote':cr.get('quote'),
                 'search_usefulness':r.get('search_usefulness'), 'cue_explanation':t.get('cue_explanation'), 'final_preference':(d.get('final') or {}).get('preference'), 'final_reason':(d.get('final') or {}).get('reason'),
                 'final_recommended_change':(d.get('final') or {}).get('recommended_change'), 'source_file':path.name,
                 'selected_nodes':counts.get('select_node',0),'searches':counts.get('search',0),'cue_highlights':counts.get('cue_highlight',0),'reading_reply_toggles':counts.get('reading_replies_toggle',0),'branch_toggles':counts.get('toggle_branch',0)}
            for k in range(1,8):row[f'rating_Q{k}']=r.get(f'Q{k}')
            for i in range(3):
                task=activities[i] if len(activities)>i else {}
                row[f'T{i+1}_answer']=task.get('answer');row[f'T{i+1}_elapsed_ms']=task.get('elapsed_ms');row[f'T{i+1}_comment_ids']=';'.join(task.get('selected_comment_ids',[]))
            rows.append(row)
    if not rows:print('No complete study JSON responses found.');return
    columns=list(rows[0]);args.out.parent.mkdir(exist_ok=True,parents=True)
    with args.out.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,columns,extrasaction='ignore');w.writeheader();w.writerows(rows)
    print(f'Wrote {len(rows)} trial rows from {len(seen)} distinct participant codes to {args.out}')
if __name__=='__main__':main()
