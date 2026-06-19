import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
export const profileService = {
 async get(userId:string){const {data,error}=await supabase.from('perfil').select('*').eq('user_id',userId).single();if(error)throw error;return data as Profile},
 async update(userId:string,profile:Partial<Profile>){const {data,error}=await supabase.from('perfil').update(profile).eq('user_id',userId).select().single();if(error)throw error;return data as Profile},
 async uploadAvatar(userId:string,file:File){const extension=file.name.split('.').pop()||'jpg',path=`${userId}/avatar.${extension}`;const {error}=await supabase.storage.from('finance-files').upload(path,file,{upsert:true});if(error)throw error;const {data,error:signError}=await supabase.storage.from('finance-files').createSignedUrl(path,60*60*24*365);if(signError)throw signError;return data?.signedUrl??''},
 async updateEmail(email:string){const {error}=await supabase.auth.updateUser({email});if(error)throw error},
 async updatePassword(password:string){const {error}=await supabase.auth.updateUser({password});if(error)throw error},
};
