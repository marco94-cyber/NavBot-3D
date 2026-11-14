from fastapi.testclient import TestClient
from main import app


def test_frontend_api_contract():
    with TestClient(app) as client:
        r=client.get('/api/health')
        assert r.status_code==200 and r.json()['backend']=='Python FastAPI'
        state=client.get('/api/state').json()
        assert len(state['robots'])==3 and state['map']['width']==36
        assert len(state['map']['staticBlocked'])>0
        assert 'history' not in state
        r=client.post('/api/command',json={'action':'add-task','pickup':'Pickup A','delivery':'Delivery A','priority':'urgent'})
        assert r.status_code==200
        assert len(r.json()['state']['tasks'])==1
        r=client.post('/api/benchmark',json={'start':'Pickup A','goal':'Delivery A'})
        assert r.status_code==200 and set(r.json())=={'bfs','dfs','astar','greedy'}
        r=client.get('/api/history')
        assert r.status_code==200 and isinstance(r.json()['history'],list)
        assert client.post('/api/command',json={'action':'invalid'}).status_code==400
        assert client.post('/api/command',json={'action':'reset'}).status_code==200
