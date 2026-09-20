import importlib.util,pathlib,unittest
s=importlib.util.spec_from_file_location('gate',pathlib.Path(__file__).parents[1]/'qualify-shadow.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Qualification(unittest.TestCase):
 def test_missing_labels_never_qualify(self): self.assertFalse(m.qualify({}, {}, [])['qualifiesForShadow'])
 def test_recall_regression_blocks_higher_f1(self):
  a=dict(eligible=True,precision=.7,recall=.9,f1=.78);b=dict(eligible=True,precision=.95,recall=.85,f1=.89)
  self.assertFalse(m.qualify(a,b,[dict(session='x',independent=True,truth=100,baseline=90,candidate=99)])['qualifiesForShadow'])
 def test_historical_regression_blocks(self):
  a=dict(eligible=True,precision=.8,recall=.8,f1=.8);b=dict(eligible=True,precision=.9,recall=.9,f1=.9)
  self.assertFalse(m.qualify(a,b,[dict(session='x',independent=True,truth=100,baseline=95,candidate=93)])['qualifiesForShadow'])
 def test_qualification_never_promotes_visible(self):
  a=dict(eligible=True,precision=.8,recall=.8,f1=.8);b=dict(eligible=True,precision=.9,recall=.9,f1=.9)
  q=m.qualify(a,b,[dict(session='x',independent=True,truth=100,baseline=95,candidate=96)])
  self.assertTrue(q['qualifiesForShadow']);self.assertFalse(q['visibleCounterPromotion']);self.assertFalse(q['automaticPromotion'])
if __name__=='__main__': unittest.main()
